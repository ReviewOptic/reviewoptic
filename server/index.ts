import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
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
import { sendPlatformReviewRequest } from "./email";
import { pool } from "./storage";
import path from "path";
import { execSync } from "child_process";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
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
    secure: false, // set true if using HTTPS
    httpOnly: true,
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

  // Automated follow-ups and no-response checks
  const runScheduledChecks = async () => {
    const followUps = await storage.sendFollowUps().catch(console.error);
    if (followUps) log(`Sent ${followUps} automated follow-up(s)`);
    const noResponse = await storage.markNoResponse().catch(console.error);
    if (noResponse) log(`Marked ${noResponse} customer(s) as no_response`);
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
          AND auto_review_requested_at IS NULL
          AND created_at <= NOW() - INTERVAL '30 days'
      `);
      for (const u of initial) {
        try {
          await sendPlatformReviewRequest({ email: u.email, firstName: u.first_name, companyName: u.company_name }, false);
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
          AND auto_review_requested_at IS NOT NULL
          AND auto_review_follow_ups = 0
          AND auto_review_requested_at <= NOW() - INTERVAL '3 days'
      `);
      for (const u of fu1) {
        try {
          await sendPlatformReviewRequest({ email: u.email, firstName: u.first_name, companyName: u.company_name }, true);
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
          AND auto_review_requested_at IS NOT NULL
          AND auto_review_follow_ups = 1
          AND auto_review_requested_at <= NOW() - INTERVAL '7 days'
      `);
      for (const u of fu2) {
        try {
          await sendPlatformReviewRequest({ email: u.email, firstName: u.first_name, companyName: u.company_name }, true);
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

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
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
