import "dotenv/config";
import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
const { Pool } = pkg;
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { storage } from "./storage";
import { runMigrations, ensureExternalReviewsTable } from "./migrate";
import { runMonthlyInsightEmails } from "./insightEmail";
import { sendPreScreenEmail } from "./email";
import { sendReviewSMS, sendWhatsAppMessage, sendWhatsAppTemplate } from "./sms";
import { pool } from "./storage";
import path from "path";
import { execSync } from "child_process";

// Normalise APP_URL — ensure it always carries a scheme (https://)
// so URLs passed to Stripe and emails are always valid.
if (process.env.APP_URL && !process.env.APP_URL.startsWith("http")) {
  process.env.APP_URL = `https://${process.env.APP_URL}`;
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
}

process.on("uncaughtException", (err) => {
  Sentry.captureException(err);
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason);
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

declare module "express-session" {
  interface SessionData {
    userId: string;
    accountId: string;
    userRole: string;
    originalUserId: string;
    originalAccountId: string;
    fbOauthState: string;
    fbUserToken: string;
    isDemo: boolean;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const app = express();
const httpServer = createServer(app);

// Trust proxy — required for secure cookies behind Cloudflare/Nginx
app.set("trust proxy", 1);

// Gzip compression for all responses
app.use(compression());

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // disabled — Stripe embedded checkout requires relaxed CSP
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting on auth and sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts — please try again in 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Redirect non-www to www (reviewoptic.com → www.reviewoptic.com)
app.use((req, res, next) => {
  const host = req.headers.host || "";
  if (host === "reviewoptic.com" || host.startsWith("reviewoptic.com:")) {
    return res.redirect(301, `https://www.reviewoptic.com${req.url}`);
  }
  next();
});

// Session middleware
const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

app.use(session({
  store: new PgSession({
    pool: sessionPool,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "reviewoptic-secret-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: "auto",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await runMigrations().catch(console.error);
  await ensureExternalReviewsTable().catch(console.error);
  await seedDatabase().catch(console.error);
  await registerRoutes(httpServer, app);

  // Automated follow-ups, no-response checks, and DB-scheduled sends
  const runScheduledChecks = async () => {
    const followUps = await storage.sendFollowUps().catch(console.error);
    if (followUps) log(`Sent ${followUps} automated follow-up(s)`);
    const noResponse = await storage.markNoResponse().catch(console.error);
    if (noResponse) log(`Marked ${noResponse} customer(s) as no_response`);

    // Send any DB-scheduled review requests that are now due
    try {
      const { rows: dueRequests } = await pool.query(`
        SELECT rr.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
               c.channel as customer_channel
        FROM review_requests rr
        JOIN customers c ON c.id = rr.customer_id
        WHERE rr.schedule_status = 'pending'
          AND rr.scheduled_send_at <= NOW()
      `);
      for (const rr of dueRequests) {
        try {
          const settings = await storage.getSettings(rr.account_id);
          if (!settings) continue;
          const customer = { id: rr.customer_id, name: rr.customer_name, email: rr.customer_email, phone: rr.customer_phone, channel: rr.channel || rr.customer_channel } as any;
          const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
          const smsLink = `${appUrl}/r/${rr.id}`;
          const firstName = customer.name.split(" ")[0];
          if (customer.channel === "email") {
            await sendPreScreenEmail(customer, settings, rr.id, appUrl);
          } else if (customer.channel === "sms") {
            const body = `Hi ${firstName}, thanks for choosing ${settings.businessName}! Tap the link below to rate your experience:\n${smsLink}`;
            await sendReviewSMS(customer, settings, { subject: "", body } as any, []);
          } else if (customer.channel === "whatsapp") {
            const ratingLink = `${appUrl}/review?rid=${rr.id}`;
            const sid = process.env.WHATSAPP_TEMPLATE_SID_REQUEST;
            if (!sid) throw new Error("WHATSAPP_TEMPLATE_SID_REQUEST not configured");
            await sendWhatsAppTemplate(customer.phone, sid, { "1": firstName, "2": settings.businessName, "3": ratingLink });
          }
          await pool.query(`UPDATE review_requests SET schedule_status = 'sent', status = 'sent', sent_at = NOW() WHERE id = $1`, [rr.id]);
          await pool.query(`UPDATE customers SET status = 'request_sent' WHERE id = $1`, [customer.id]);
          log(`Sent scheduled review request to ${customer.name} (${customer.channel})`);
        } catch (err: any) {
          log(`Failed to send scheduled request ${rr.id}: ${err.message}`);
          await pool.query(`UPDATE review_requests SET schedule_status = 'failed' WHERE id = $1`, [rr.id]);
        }
      }
    } catch (err: any) {
      log(`Scheduled send runner error: ${err.message}`);
    }
  };
  // Do NOT run on startup — prevents follow-up emails firing on every redeploy.
  // The interval below handles all scheduled checks.
  setInterval(runScheduledChecks, 60 * 60 * 1000);

  // Monthly insight emails — checked once a day
  await runMonthlyInsightEmails().catch(console.error);
  setInterval(() => runMonthlyInsightEmails().catch(console.error), 24 * 60 * 60 * 1000);

  // Daily: cancel accounts that have had a failed payment for more than 7 days
  const runPaymentFailedCancellations = async () => {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, first_name, stripe_subscription_id FROM users
         WHERE payment_failed = true
           AND payment_failed_count >= 2
           AND plan_type NOT IN ('cancelled', 'free')`
      );
      for (const user of rows) {
        // Cancel the Stripe subscription
        if (user.stripe_subscription_id) {
          const stripe = (await import("stripe")).default;
          const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || "");
          await stripeClient.subscriptions.cancel(user.stripe_subscription_id).catch((err: any) =>
            console.error(`[payment-cancellation] Failed to cancel Stripe sub for ${user.email}:`, err.message)
          );
        }
        // Mark as cancelled, clear payment_failed flag
        await pool.query(
          `UPDATE users SET plan_type = 'cancelled', cancelled_at = NOW(), payment_failed = false, payment_failed_at = NULL WHERE id = $1`,
          [user.id]
        );
        // Send cancellation email explaining why
        const appUrl = process.env.APP_URL || "https://www.reviewoptic.com";
        const { sendCancellationEmail } = await import("./email");
        sendCancellationEmail(user.email, user.first_name || "", "immediately", `${appUrl}/billing`).catch((err: any) =>
          console.error(`[payment-cancellation] Failed to send cancellation email to ${user.email}:`, err.message)
        );
        console.log(`[payment-cancellation] Auto-cancelled account for ${user.email} after 7 days of failed payment`);
      }
    } catch (err: any) {
      console.error("[payment-cancellation] Error:", err.message);
    }
  };
  await runPaymentFailedCancellations().catch(console.error);
  setInterval(() => runPaymentFailedCancellations().catch(console.error), 24 * 60 * 60 * 1000);

  // Daily: delete unverified accounts older than 5 days (never completed registration)
  const runUnverifiedAccountCleanup = async () => {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, first_name, account_id FROM users
         WHERE email_verified = false AND is_admin = false
           AND created_at < NOW() - INTERVAL '5 days'`
      );
      if (rows.length === 0) return;
      const appUrl = process.env.APP_URL || "https://www.reviewoptic.com";
      const registerUrl = `${appUrl}/register`;
      const { sendIncompleteRegistrationEmail } = await import("./email");
      // Also remove them from the admin's customer list (auto-added at registration)
      const adminEmail = process.env.ADMIN_EMAIL;
      let adminAccountId: string | null = null;
      if (adminEmail) {
        const { rows: adminRows } = await pool.query(`SELECT account_id FROM users WHERE email = $1 LIMIT 1`, [adminEmail.toLowerCase()]);
        adminAccountId = adminRows[0]?.account_id ?? null;
      }
      for (const u of rows) {
        // Send email before deleting
        sendIncompleteRegistrationEmail(u.email, u.first_name || "", registerUrl).catch((err: any) =>
          console.error(`[unverified-cleanup] Failed to send email to ${u.email}:`, err.message)
        );
        if (adminAccountId) {
          await pool.query(`DELETE FROM customers WHERE account_id = $1 AND email = $2`, [adminAccountId, u.email]).catch(() => {});
        }
        await pool.query(`DELETE FROM templates WHERE account_id = $1`, [u.account_id]).catch(() => {});
        await pool.query(`DELETE FROM settings WHERE account_id = $1`, [u.account_id]).catch(() => {});
        await pool.query(`DELETE FROM accounts WHERE id = $1`, [u.account_id]).catch(() => {});
        await pool.query(`DELETE FROM users WHERE id = $1`, [u.id]);
        console.log(`[unverified-cleanup] Deleted unverified account: ${u.email}`);
      }
    } catch (err: any) {
      console.error("[unverified-cleanup] Error:", err.message);
    }
  };
  await runUnverifiedAccountCleanup().catch(console.error);
  setInterval(() => runUnverifiedAccountCleanup().catch(console.error), 24 * 60 * 60 * 1000);

  // Daily: permanently delete accounts that have passed their 30-day deletion window
  const runAccountDeletions = async () => {
    try {
      const { rows } = await pool.query(
        `SELECT account_id FROM users WHERE scheduled_for_deletion_at IS NOT NULL AND scheduled_for_deletion_at <= NOW() AND role = 'owner'`
      );
      for (const row of rows) {
        const accountId = row.account_id;
        // Delete all account data in dependency order
        await pool.query(`DELETE FROM review_platform_clicks WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM private_feedback WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM review_requests WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM activity_log WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM templates WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM recordings WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM customers WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM settings WHERE account_id = $1`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM chat_messages WHERE user_id IN (SELECT id FROM users WHERE account_id = $1)`, [accountId]).catch(() => {});
        await pool.query(`DELETE FROM users WHERE account_id = $1`, [accountId]);
        console.log(`[account-deletion] Permanently deleted account ${accountId}`);
      }
    } catch (err: any) {
      console.error("[account-deletion] Error:", err.message);
    }
  };
  await runAccountDeletions().catch(console.error);
  setInterval(() => runAccountDeletions().catch(console.error), 24 * 60 * 60 * 1000);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (status >= 500) Sentry.captureException(err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  function startServer(attemptsLeft = 30) {
    httpServer.removeAllListeners("error");
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });
    httpServer.once("error", (err: any) => {
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        log(`Port ${port} in use, killing occupant and retrying in 2s… (${attemptsLeft} left)`);
        try { execSync(`fuser -k ${port}/tcp 2>/dev/null || true`); } catch {}
        setTimeout(() => startServer(attemptsLeft - 1), 2000);
      } else {
        console.error("Fatal server error:", err);
        process.exit(1);
      }
    });
  }

  startServer();
})();
