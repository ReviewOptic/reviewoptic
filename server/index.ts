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
import { runMigrations } from "./migrate";
import { runMonthlyInsightEmails } from "./insightEmail";
import { sendPlatformReviewRequest, sendPreScreenEmail } from "./email";
import { sendReviewSMS, sendWhatsAppMessage } from "./sms";
import { pool } from "./storage";
import path from "path";
import { execSync } from "child_process";

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

// Session middleware
const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

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
            const body = `Hi ${firstName} 👋\n\nThank you for choosing ${settings.businessName}! We'd love to hear how we did.\n\nTap the link below to rate your experience:\n${ratingLink}\n\nReply STOP to opt out.`;
            await sendWhatsAppMessage(customer.phone, body);
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
  await runScheduledChecks();
  setInterval(runScheduledChecks, 60 * 60 * 1000);

  // Monthly insight emails — checked once a day
  await runMonthlyInsightEmails().catch(console.error);
  setInterval(() => runMonthlyInsightEmails().catch(console.error), 24 * 60 * 60 * 1000);

  // Automated platform review requests — ask ReviewOptic users to leave a review
  // Initial: 30 days after registration. Follow-up 1: +3 days. Follow-up 2: +7 days.
  const runPlatformReviewRequests = async () => {
    try {
      // Initial requests: registered 30+ days ago, not yet sent, email verified, not admin
      const { rows: initial } = await pool.query(`
        SELECT id, email, first_name, last_name, company_name FROM users
        WHERE email_verified = true
          AND is_admin = false
          AND COALESCE(email_unsubscribed, false) = false
          AND auto_review_requested_at IS NULL
          AND created_at <= NOW() - INTERVAL '30 days'
      `);
      for (const u of initial) {
        try {
          await sendPlatformReviewRequest({ id: u.id, email: u.email, firstName: u.first_name, companyName: u.company_name }, false);
          await pool.query(`UPDATE users SET auto_review_requested_at = NOW(), auto_review_follow_ups = 0 WHERE id = $1`, [u.id]);
          log(`[platform review] Initial request sent to ${u.email}`);
        } catch (err: any) {
          console.error(`[platform review] Failed for ${u.email}:`, err.message);
        }
      }

      // Follow-up 1: sent initial 3+ days ago, 0 follow-ups so far
      const { rows: fu1 } = await pool.query(`
        SELECT id, email, first_name, last_name, company_name FROM users
        WHERE email_verified = true
          AND is_admin = false
          AND COALESCE(email_unsubscribed, false) = false
          AND auto_review_requested_at IS NOT NULL
          AND auto_review_follow_ups = 0
          AND auto_review_requested_at <= NOW() - INTERVAL '3 days'
      `);
      for (const u of fu1) {
        try {
          await sendPlatformReviewRequest({ id: u.id, email: u.email, firstName: u.first_name, companyName: u.company_name }, true);
          await pool.query(`UPDATE users SET auto_review_follow_ups = 1 WHERE id = $1`, [u.id]);
          log(`[platform review] Follow-up 1 sent to ${u.email}`);
        } catch (err: any) {
          console.error(`[platform review] FU1 failed for ${u.email}:`, err.message);
        }
      }

      // Follow-up 2: sent initial 7+ days ago, 1 follow-up so far
      const { rows: fu2 } = await pool.query(`
        SELECT id, email, first_name, last_name, company_name FROM users
        WHERE email_verified = true
          AND is_admin = false
          AND COALESCE(email_unsubscribed, false) = false
          AND auto_review_requested_at IS NOT NULL
          AND auto_review_follow_ups = 1
          AND auto_review_requested_at <= NOW() - INTERVAL '7 days'
      `);
      for (const u of fu2) {
        try {
          await sendPlatformReviewRequest({ id: u.id, email: u.email, firstName: u.first_name, companyName: u.company_name }, true);
          await pool.query(`UPDATE users SET auto_review_follow_ups = 2 WHERE id = $1`, [u.id]);
          log(`[platform review] Follow-up 2 sent to ${u.email}`);
        } catch (err: any) {
          console.error(`[platform review] FU2 failed for ${u.email}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[platform review] Runner error:", err.message);
    }
  };
  await runPlatformReviewRequests().catch(console.error);
  setInterval(() => runPlatformReviewRequests().catch(console.error), 24 * 60 * 60 * 1000);

  // Daily: send trial reminder emails to users whose trial ends in ~2 days
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
