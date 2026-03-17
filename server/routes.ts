import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, pool } from "./storage";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import OpenAI from "openai";
import { sendReviewEmail, sendVerificationEmail } from "./email";
import { sendReviewSMS } from "./sms";
import type { Review, Customer, Settings } from "@shared/schema";

async function sendResetEmail(to: string, resetUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[password reset] No RESEND_API_KEY set. Reset link for ${to}: ${resetUrl}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "ReviewOptic <noreply@reviewoptic.com>",
    to,
    subject: "Reset your ReviewOptic password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:24px;">
          <span style="font-weight:700;font-size:18px;">ReviewOptic</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
        <p style="color:#555;margin:0 0 24px;line-height:1.6;">
          We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Reset my password
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
      </div>
    `,
  });
}

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || !req.session.accountId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // Block all writes while impersonating — read-only mode
  if (req.session.originalUserId && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    return res.status(403).json({ message: "Cannot make changes while impersonating a user." });
  }
  next();
}

async function postReviewToSocial(review: Review, customer: Customer, settings: Settings) {
  if (!settings.socialPostEnabled) return;
  const message = settings.socialPostMessage
    .replace("{stars}", String(review.stars))
    .replace("{customer_name}", customer.name);

  if (settings.facebookPageAccessToken && settings.facebookPageId) {
    try {
      await fetch(`https://graph.facebook.com/v18.0/${settings.facebookPageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: settings.facebookPageAccessToken }),
      });
    } catch (err) {
      console.error("Facebook post error:", err);
    }
  }

  if (settings.linkedinAccessToken && settings.linkedinOrganizationId) {
    try {
      await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.linkedinAccessToken}`,
        },
        body: JSON.stringify({
          author: `urn:li:organization:${settings.linkedinOrganizationId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: message },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
    } catch (err) {
      console.error("LinkedIn post error:", err);
    }
  }
}

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, _file, cb) => cb(null, `logo-${randomUUID()}.png`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.webm`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files allowed"));
  },
});

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.webm`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only audio files allowed"));
  },
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Auth routes (no requireAuth) ──────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, firstName, lastName, companyName } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    if (!firstName || !lastName) return res.status(400).json({ message: "First and last name are required" });
    if (!companyName) return res.status(400).json({ message: "Company name is required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: "Password must contain at least one number" });
    if (!/[^a-zA-Z0-9]/.test(password)) return res.status(400).json({ message: "Password must contain at least one symbol" });

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      if (!existing.emailVerified) {
        // Resend verification email and let the frontend show the "check your email" screen
        const newToken = randomUUID();
        await storage.updateVerificationToken(existing.id, newToken);
        const appUrl = process.env.APP_URL || "http://localhost:5000";
        const verifyUrl = `${appUrl}/verify-email?token=${newToken}`;
        await sendVerificationEmail(existing.email, verifyUrl).catch(err =>
          console.error("[register] Failed to resend verification email:", err.message)
        );
        return res.json({ requiresVerification: true, email: existing.email });
      }
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const account = await storage.createAccount();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = randomUUID();
    const user = await storage.createUser({
      accountId: account.id,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
      verificationToken,
      firstName,
      lastName,
      companyName,
    });

    // Create default settings for the new account
    await storage.upsertSettings(account.id, {
      businessName: companyName,
    });

    // Create default templates
    const defaultTemplates = [
      {
        id: randomUUID(), accountId: account.id, name: "Review Request", templateType: "review_request",
        channel: "email", isDefault: true,
        subject: "How was your experience with {{business_name}}?",
        body: `Hi {{first_name}},\n\nThank you for choosing {{business_name}}. We'd love to hear about your experience — it only takes a minute and means a lot to us.\n\n{{review_link}}\n\nThanks again,\nThe {{business_name}} team`,
      },
      {
        id: randomUUID(), accountId: account.id, name: "Follow-up", templateType: "follow_up",
        channel: "email", isDefault: true,
        subject: "Still have a moment to leave us a review?",
        body: `Hi {{first_name}},\n\nWe just wanted to follow up — if you have a spare moment, we'd really appreciate a quick review. It helps us more than you know!\n\n{{review_link}}\n\nThank you,\nThe {{business_name}} team`,
      },
      {
        id: randomUUID(), accountId: account.id, name: "Review Request", templateType: "review_request",
        channel: "sms", isDefault: true,
        subject: "",
        body: "Hi {{first_name}}, thanks for choosing {{business_name}}! Could you spare a moment to leave us a review? {{review_link}}",
      },
      {
        id: randomUUID(), accountId: account.id, name: "Follow-up", templateType: "follow_up",
        channel: "sms", isDefault: true,
        subject: "",
        body: "Hi {{first_name}}, just a quick follow-up from {{business_name}}. We'd really appreciate your review: {{review_link}}",
      },
    ];
    for (const t of defaultTemplates) {
      await storage.createTemplate(t);
    }

    // Auto-add as customer in admin account for ReviewOptic's own review requests
    if (process.env.ADMIN_EMAIL) {
      const adminUser = await storage.getUserByEmail(process.env.ADMIN_EMAIL);
      if (adminUser) {
        await storage.createCustomer({
          id: randomUUID(),
          accountId: adminUser.accountId,
          name: `${firstName} ${lastName}`,
          email: email.toLowerCase(),
          phone: "",
          serviceDate: new Date().toISOString().split("T")[0],
          serviceType: "ReviewOptic subscription",
          notes: `Company: ${companyName}`,
          status: "pending_request",
          doNotContact: false,
          channel: "email",
        });
      }
    }

    const appUrl = process.env.APP_URL || "http://localhost:5000";
    const verifyUrl = `${appUrl}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user.email, verifyUrl).catch(err =>
      console.error("[register] Failed to send verification email:", err.message)
    );

    res.json({ requiresVerification: true, email: user.email });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before signing in. Check your inbox for the verification link." });
    }

    req.session.userId = user.id;
    req.session.accountId = user.accountId;
    delete req.session.originalUserId;
    delete req.session.originalAccountId;
    res.json({ id: user.id, email: user.email, accountId: user.accountId, isAdmin: user.isAdmin });
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ message: "Missing token" });
    const user = await storage.verifyUserEmail(token);
    if (!user) return res.status(400).json({ message: "Invalid or already used verification link." });
    req.session.userId = user.id;
    req.session.accountId = user.accountId;
    res.json({ success: true });
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await storage.getUserByEmail(email);
    if (!user || user.emailVerified) return res.json({ success: true }); // silent — don't reveal account existence
    const newToken = randomUUID();
    await storage.updateVerificationToken(user.id, newToken);
    const appUrl = process.env.APP_URL || "http://localhost:5000";
    const verifyUrl = `${appUrl}/verify-email?token=${newToken}`;
    await sendVerificationEmail(user.email, verifyUrl).catch(err =>
      console.error("[resend-verification] Failed to send email:", err.message)
    );
    res.json({ success: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    // Always return success to avoid revealing whether an email exists
    const user = await storage.getUserByEmail(email);
    if (user) {
      const token = await storage.createResetToken(user.id);
      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await sendResetEmail(user.email, resetUrl).catch(err =>
        console.error("Failed to send reset email:", err)
      );
    }
    res.json({ success: true });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: "Password must contain at least one number" });
    if (!/[^a-zA-Z0-9]/.test(password)) return res.status(400).json({ message: "Password must contain at least one symbol" });
    const record = await storage.getResetToken(token);
    if (!record) return res.status(400).json({ message: "Invalid or expired reset link" });
    if (new Date() > record.expiresAt) {
      await storage.deleteResetToken(token);
      return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await storage.updateUserPassword(record.userId, hashedPassword);
    await storage.deleteResetToken(token);
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({
      id: user.id,
      email: user.email,
      accountId: user.accountId,
      isAdmin: user.isAdmin,
      isImpersonating: !!req.session.originalUserId,
    });
  });

  // ── Admin routes ─────────────────────────────────────────────────────────

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    // Allow if currently impersonating (original user was admin)
    const adminId = req.session.originalUserId || req.session.userId;
    storage.getUser(adminId).then(user => {
      if (!user?.isAdmin) return res.status(403).json({ message: "Admin access required" });
      next();
    }).catch(() => res.status(500).json({ message: "Server error" }));
  }

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const [allUsers, stats] = await Promise.all([storage.getAllUsers(), storage.getAdminUserStats()]);
    const statsMap = Object.fromEntries(stats.map(s => [s.userId, s]));
    res.json(allUsers.map(u => ({
      id: u.id,
      email: u.email,
      accountId: u.accountId,
      isAdmin: u.isAdmin,
      emailVerified: u.emailVerified,
      customerCount: statsMap[u.id]?.customerCount ?? 0,
      reviewRequestCount: statsMap[u.id]?.reviewRequestCount ?? 0,
      lastActive: statsMap[u.id]?.lastActive ?? null,
    })));
  });

  app.post("/api/admin/verify-user/:userId", requireAdmin, async (req, res) => {
    await storage.verifyUserManually(String(req.params.userId));
    res.json({ success: true });
  });

  app.delete("/api/admin/user/:userId", requireAdmin, async (req, res) => {
    const target = await storage.getUser(String(req.params.userId));
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.isAdmin) return res.status(400).json({ message: "Cannot delete an admin account" });
    await storage.deleteUserAccount(String(req.params.userId));
    res.json({ success: true });
  });

  app.post("/api/admin/toggle-admin/:userId", requireAdmin, async (req, res) => {
    const target = await storage.getUser(String(req.params.userId));
    if (!target) return res.status(404).json({ message: "User not found" });
    const adminId = req.session.originalUserId || req.session.userId;
    if (target.id === adminId) return res.status(400).json({ message: "Cannot change your own admin status" });
    await storage.setUserAdmin(target.id, !target.isAdmin);
    res.json({ success: true });
  });

  app.get("/api/admin/impersonation-log", requireAdmin, async (req, res) => {
    res.json(await storage.getImpersonationLog());
  });

  app.post("/api/admin/impersonate/:userId", requireAdmin, async (req, res) => {
    const target = await storage.getUser(String(req.params.userId));
    if (!target) return res.status(404).json({ message: "User not found" });
    const adminId = req.session.originalUserId || req.session.userId!;
    const admin = await storage.getUser(adminId);
    req.session.originalUserId = req.session.originalUserId || req.session.userId;
    req.session.originalAccountId = req.session.originalAccountId || req.session.accountId;
    req.session.userId = target.id;
    req.session.accountId = target.accountId;
    await storage.logImpersonation(adminId, admin?.email ?? "", target.id, target.email);
    res.json({ success: true });
  });

  app.post("/api/admin/stop-impersonation", requireAdmin, async (req, res) => {
    if (!req.session.originalUserId) return res.status(400).json({ message: "Not impersonating" });
    req.session.userId = req.session.originalUserId;
    req.session.accountId = req.session.originalAccountId;
    delete req.session.originalUserId;
    delete req.session.originalAccountId;
    res.json({ success: true });
  });

  app.get("/api/admin/metrics", requireAdmin, async (req, res) => {
    try {
      // Date range filter — applied to charts, feed, feature usage, top users
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const hasRange = !!(from && to);
      const dateParams = hasRange ? [from, to] : [];
      const dateFilter = hasRange ? `AND created_at >= $1 AND created_at < ($2::date + 1)` : "";
      const rrDateFilter = hasRange ? `AND rr.created_at >= $1 AND rr.created_at < ($2::date + 1)` : "";
      const topUsersFilter = hasRange ? `AND a.created_at >= $1 AND a.created_at < ($2::date + 1)` : `AND a.created_at >= NOW() - INTERVAL '7 days'`;

      const [
        totalUsersR, newThisWeekR, newLastWeekR, activeThisWeekR, activeTodayR,
        totalRequestsR, requestsThisWeekR, requestsLastWeekR, requestsTodayR,
        recentFeedR, featureUsageR, topUsersR, funnelR,
        retentionDay1R, retentionWeek1R, atRiskR, timeToFirstActionR,
        usersChartR, requestsChartR, activityDowR, activityHourR,
        signupsYesterdayR, activityYesterdayR, activityTodayCountR,
      ] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM users WHERE NOT is_admin`),
        pool.query(`SELECT COUNT(*) FROM users WHERE NOT is_admin AND created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(*) FROM users WHERE NOT is_admin AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(DISTINCT account_id) FROM activity_log WHERE created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(DISTINCT account_id) FROM activity_log WHERE created_at >= CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) FROM review_requests`),
        pool.query(`SELECT COUNT(*) FROM review_requests WHERE created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(*) FROM review_requests WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT COUNT(*) FROM review_requests WHERE created_at >= CURRENT_DATE`),
        pool.query(`SELECT rr.id, rr.channel, rr.status, rr.created_at, u.email, COALESCE(s.business_name, u.email) as business_name FROM review_requests rr JOIN users u ON u.account_id = rr.account_id JOIN settings s ON s.account_id = rr.account_id WHERE 1=1 ${rrDateFilter} ORDER BY rr.created_at DESC LIMIT 50`, dateParams),
        pool.query(`SELECT type, COUNT(*) as count FROM activity_log WHERE 1=1 ${dateFilter} GROUP BY type ORDER BY count DESC`, dateParams),
        pool.query(`SELECT u.email, u.created_at as signup_date, COUNT(a.id) as action_count, MAX(a.created_at) as last_active FROM users u JOIN activity_log a ON a.account_id = u.account_id WHERE NOT u.is_admin ${topUsersFilter} GROUP BY u.id, u.email, u.created_at ORDER BY action_count DESC LIMIT 10`, dateParams),
        pool.query(`SELECT (SELECT COUNT(*) FROM users WHERE NOT is_admin) as signups, (SELECT COUNT(DISTINCT account_id) FROM activity_log) as first_action, (SELECT COUNT(*) FROM (SELECT account_id FROM activity_log GROUP BY account_id, DATE(created_at) HAVING COUNT(*) > 0) sub GROUP BY account_id HAVING COUNT(*) >= 2) as return_visit, (SELECT COUNT(DISTINCT account_id) FROM activity_log GROUP BY account_id HAVING COUNT(*) >= 10) as power_users`),
        pool.query(`SELECT ROUND(100.0 * COUNT(DISTINCT d.account_id) / NULLIF(COUNT(DISTINCT u.account_id), 0), 1) as rate FROM users u LEFT JOIN activity_log d ON d.account_id = u.account_id AND d.created_at >= u.created_at + INTERVAL '1 day' AND d.created_at < u.created_at + INTERVAL '2 days' WHERE NOT u.is_admin`),
        pool.query(`SELECT ROUND(100.0 * COUNT(DISTINCT d.account_id) / NULLIF(COUNT(DISTINCT u.account_id), 0), 1) as rate FROM users u LEFT JOIN activity_log d ON d.account_id = u.account_id AND d.created_at >= u.created_at AND d.created_at < u.created_at + INTERVAL '7 days' WHERE NOT u.is_admin`),
        pool.query(`SELECT u.email, MAX(a.created_at) as last_active FROM users u JOIN activity_log a ON a.account_id = u.account_id WHERE NOT u.is_admin GROUP BY u.id, u.email HAVING MAX(a.created_at) < NOW() - INTERVAL '7 days' AND MAX(a.created_at) > NOW() - INTERVAL '30 days' ORDER BY last_active DESC LIMIT 10`),
        pool.query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first_act - u.created_at))/3600), 1) as avg_hours FROM users u JOIN (SELECT account_id, MIN(created_at) as first_act FROM activity_log GROUP BY account_id) fa ON fa.account_id = u.account_id WHERE NOT u.is_admin`),
        pool.query(`SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count FROM users WHERE NOT is_admin AND (${hasRange ? `created_at >= $1 AND created_at < ($2::date + 1)` : `created_at >= NOW() - INTERVAL '30 days'`}) GROUP BY date ORDER BY date`, dateParams),
        pool.query(`SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count FROM review_requests WHERE (${hasRange ? `created_at >= $1 AND created_at < ($2::date + 1)` : `created_at >= NOW() - INTERVAL '30 days'`}) GROUP BY date ORDER BY date`, dateParams),
        pool.query(`SELECT EXTRACT(DOW FROM created_at) as dow, COUNT(*) as count FROM activity_log WHERE 1=1 ${dateFilter} GROUP BY dow ORDER BY dow`, dateParams),
        pool.query(`SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count FROM activity_log WHERE 1=1 ${dateFilter} GROUP BY hour ORDER BY hour`, dateParams),
        pool.query(`SELECT COUNT(*) FROM users WHERE NOT is_admin AND created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) FROM activity_log WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`),
        pool.query(`SELECT COUNT(*) FROM activity_log WHERE created_at >= CURRENT_DATE`),
      ]);

      const totalUsers = parseInt(totalUsersR.rows[0].count);
      const newThisWeek = parseInt(newThisWeekR.rows[0].count);
      const newLastWeek = parseInt(newLastWeekR.rows[0].count);
      const pctChange = newLastWeek === 0 ? null : Math.round(((newThisWeek - newLastWeek) / newLastWeek) * 100);

      const totalRequests = parseInt(totalRequestsR.rows[0].count);
      const requestsThisWeek = parseInt(requestsThisWeekR.rows[0].count);
      const requestsLastWeek = parseInt(requestsLastWeekR.rows[0].count);
      const requestsPctChange = requestsLastWeek === 0 ? null : Math.round(((requestsThisWeek - requestsLastWeek) / requestsLastWeek) * 100);

      const funnelRow = funnelR.rows[0];
      const funnelSignups = parseInt(funnelRow?.signups || 0);
      const funnelFirstAction = parseInt(funnelRow?.first_action || 0);
      const funnelReturnVisit = parseInt((await pool.query(`SELECT COUNT(*) FROM (SELECT account_id, COUNT(DISTINCT DATE(created_at)) as days FROM activity_log GROUP BY account_id HAVING COUNT(DISTINCT DATE(created_at)) >= 2) sub`)).rows[0].count);
      const funnelPowerUsers = parseInt((await pool.query(`SELECT COUNT(*) FROM (SELECT account_id FROM activity_log GROUP BY account_id HAVING COUNT(*) >= 10) sub`)).rows[0].count);

      const dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

      const alerts = [];
      if (parseInt(signupsYesterdayR.rows[0].count) === 0 && parseInt(newThisWeekR.rows[0].count) < 2) {
        alerts.push({ severity: 'yellow', message: 'No new signups in the last 24 hours' });
      }
      const actToday = parseInt(activityTodayCountR.rows[0].count);
      const actYesterday = parseInt(activityYesterdayR.rows[0].count);
      if (actYesterday > 0 && actToday < actYesterday * 0.4) {
        alerts.push({ severity: 'red', message: `Activity today (${actToday}) is significantly lower than yesterday (${actYesterday})` });
      }
      if (alerts.length === 0) alerts.push({ severity: 'green', message: 'All systems healthy' });

      res.json({
        userMetrics: {
          total: totalUsers,
          newThisWeek,
          newLastWeek,
          pctChange,
          activeThisWeek: parseInt(activeThisWeekR.rows[0].count),
          activeToday: parseInt(activeTodayR.rows[0].count),
        },
        requestMetrics: {
          total: totalRequests,
          thisWeek: requestsThisWeek,
          lastWeek: requestsLastWeek,
          pctChange: requestsPctChange,
          today: parseInt(requestsTodayR.rows[0].count),
          avgPerUser: totalUsers > 0 ? Math.round(totalRequests / totalUsers) : 0,
          recentFeed: recentFeedR.rows,
        },
        retentionMetrics: {
          day1Rate: parseFloat(retentionDay1R.rows[0]?.rate || 0),
          week1Rate: parseFloat(retentionWeek1R.rows[0]?.rate || 0),
          atRisk: atRiskR.rows,
        },
        funnelMetrics: { signups: funnelSignups, firstAction: funnelFirstAction, returnVisit: funnelReturnVisit, powerUsers: funnelPowerUsers },
        featureUsage: featureUsageR.rows,
        topUsers: topUsersR.rows,
        timeToFirstAction: parseFloat(timeToFirstActionR.rows[0]?.avg_hours || 0),
        alerts,
        charts: {
          usersLast30Days: usersChartR.rows,
          requestsLast30Days: requestsChartR.rows,
          activityByDayOfWeek: activityDowR.rows.map((r: any) => ({ day: dowLabels[parseInt(r.dow)], count: parseInt(r.count) })),
          activityByHour: activityHourR.rows.map((r: any) => ({ hour: `${r.hour}:00`, count: parseInt(r.count) })),
        },
      });
    } catch (err: any) {
      console.error("[admin/metrics]", err.message);
      res.status(500).json({ message: err.message });
    }
  });

  // ── Public routes (no requireAuth) ───────────────────────────────────────

  // Track link click (must remain public — customers click this)
  app.get("/api/track/:requestId/click", async (req, res) => {
    const rr = await storage.updateReviewRequest(req.params.requestId, {
      clickedAt: new Date(),
      status: "clicked",
    });
    if (rr) {
      const accountId = rr.accountId;
      const customer = await storage.getCustomer(rr.customerId, accountId);
      if (customer) {
        await storage.updateCustomer(customer.id, { status: "clicked" }, accountId);
        await storage.createActivity({
          id: randomUUID(),
          accountId,
          type: "link_clicked",
          customerId: customer.id,
          customerName: customer.name,
          message: `${customer.name} clicked the review link`,
          metadata: "{}",
        });
      }
    }
    res.redirect("/review-landing?rid=" + req.params.requestId);
  });

  // Reviews submit (public — customers submit this)
  app.post("/api/reviews", async (req, res) => {
    // Get accountId from the review request (customer-facing flow)
    const rr = req.body.requestId ? await storage.getReviewRequest(req.body.requestId) : null;
    const accountId = rr?.accountId || req.session.accountId;
    if (!accountId) return res.status(400).json({ message: "Cannot determine account" });

    const review = await storage.createReview({ ...req.body, accountId });
    const customer = rr ? await storage.getCustomer(rr.customerId, accountId) : null;
    if (customer) {
      await storage.updateCustomer(customer.id, { status: "review_completed" }, accountId);
      await storage.createActivity({
        id: randomUUID(),
        accountId,
        type: "review_received",
        customerId: customer.id,
        customerName: customer.name,
        message: `${customer.name} left a ${req.body.stars}-star review on ${req.body.platform}`,
        metadata: JSON.stringify({ stars: req.body.stars, platform: req.body.platform }),
      });
      if (review.stars >= 4) {
        const settings = await storage.getSettings(accountId);
        if (settings) {
          postReviewToSocial(review, customer, settings).catch(err =>
            console.error("Social post failed:", err)
          );
        }
      }
    }
    res.json(review);
  });

  // Private feedback submit (public — customers submit this)
  app.post("/api/private-feedback", async (req, res) => {
    const rr = req.body.requestId ? await storage.getReviewRequest(req.body.requestId) : null;
    const accountId = rr?.accountId || req.session.accountId;
    if (!accountId) return res.status(400).json({ message: "Cannot determine account" });

    const feedback = await storage.createPrivateFeedback({ ...req.body, accountId });
    const customer = rr ? await storage.getCustomer(rr.customerId, accountId) : null;
    if (customer) {
      await storage.createActivity({
        id: randomUUID(),
        accountId,
        type: "private_feedback",
        customerId: customer.id,
        customerName: customer.name,
        message: `${customer.name} left private feedback (${req.body.stars} star${req.body.stars !== 1 ? "s" : ""})`,
        metadata: JSON.stringify({ stars: req.body.stars }),
      });
    }
    res.json(feedback);
  });

  // Widget embed API (public)
  app.get("/api/widget/:businessId/reviews", async (req, res) => {
    const settings = await storage.getSettings(req.params.businessId);
    const minStars = settings?.widgetMinStars || 4;
    const count = settings?.widgetCount || 5;
    const allReviews = await storage.getReviews(req.params.businessId);
    const filtered = allReviews.filter(r => r.stars >= minStars).slice(0, count);
    const customerList = await Promise.all(filtered.map(r => storage.getCustomer(r.customerId, req.params.businessId)));
    const result = filtered.map((r, i) => ({
      ...r,
      customerName: customerList[i]?.name || "Anonymous",
    }));
    res.json({ reviews: result, businessName: settings?.businessName || "My Business" });
  });

  // Public branding endpoint — returns the admin account's logo for the login page
  app.get("/api/public/branding", async (_req, res) => {
    try {
      const adminUser = await pool.query(`SELECT account_id FROM users WHERE is_admin = true LIMIT 1`);
      if (!adminUser.rows.length) return res.json({ logoUrl: "", businessName: "ReviewOptic" });
      const adminSettings = await storage.getSettings(adminUser.rows[0].account_id);
      const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
      const logoUrl = adminSettings?.logoUrl?.startsWith("http")
        ? adminSettings.logoUrl
        : adminSettings?.logoUrl
          ? `${baseUrl}${adminSettings.logoUrl}`
          : "";
      res.json({ logoUrl, businessName: adminSettings?.businessName || "ReviewOptic" });
    } catch {
      res.json({ logoUrl: "", businessName: "ReviewOptic" });
    }
  });

  // ── Protected routes (requireAuth) ───────────────────────────────────────

  // Customers
  app.get("/api/customers", requireAuth, async (req, res) => {
    const cs = await storage.getCustomers(req.session.accountId!);
    res.json(cs);
  });
  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    const c = await storage.getCustomer(String(req.params.id), req.session.accountId!);
    if (!c) return res.status(404).json({ message: "Customer not found" });
    res.json(c);
  });
  app.post("/api/customers", requireAuth, async (req, res) => {
    if (!req.body.name) return res.status(400).json({ message: "Name is required" });
    if (!req.body.email && !req.body.phone) return res.status(400).json({ message: "Email or phone number is required" });
    const c = await storage.createCustomer({ ...req.body, accountId: req.session.accountId });
    await storage.createActivity({
      id: randomUUID(),
      accountId: req.session.accountId!,
      type: "customer_added",
      customerId: c.id,
      customerName: c.name,
      message: `${c.name} added as a customer`,
      metadata: "{}",
    });
    res.json(c);
  });
  app.patch("/api/customers/:id", requireAuth, async (req, res) => {
    const c = await storage.updateCustomer(String(req.params.id), req.body, req.session.accountId!);
    if (!c) return res.status(404).json({ message: "Customer not found" });
    res.json(c);
  });
  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    await storage.deleteCustomer(String(req.params.id), req.session.accountId!);
    res.json({ success: true });
  });

  // Review Requests
  app.get("/api/review-requests", requireAuth, async (req, res) => {
    const rr = await storage.getReviewRequests(req.session.accountId!);
    res.json(rr);
  });
  // AI message generation
  app.post("/api/ai/generate-message", requireAuth, async (req, res) => {
    try {
      const { customerId, channel } = req.body;
      const customer = await storage.getCustomer(customerId, req.session.accountId!);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      const settings = await storage.getSettings(req.session.accountId!);
      if (!settings) return res.status(404).json({ message: "Settings not found" });

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "OpenAI API key not configured" });
      }

      const firstName = customer.name.split(" ")[0];
      const businessName = settings.businessName || "our business";
      const service = customer.serviceType || "the work we completed";
      const isSMS = channel === "sms" || channel === "whatsapp";

      const prompt = isSMS
        ? `Write a short, friendly SMS message asking ${firstName} to leave a review for "${businessName}" after their recent "${service}". Keep it under 160 characters, casual and warm. No URLs. Just the message text.`
        : `Write a friendly, personalised review request email message for a business called "${businessName}". The customer's first name is ${firstName} and they recently had "${service}" completed. Ask them warmly to leave a review. 3–4 sentences. Start with "Hi ${firstName}," — just the body text, no subject line, no sign-off, no review links.`;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      });

      const message = completion.choices[0]?.message?.content?.trim() || "";
      res.json({ message });
    } catch (err: any) {
      console.error("[ai/generate-message]", err.message, err.status, err.code);
      res.status(500).json({ message: err.message || "Failed to generate message" });
    }
  });

  app.post("/api/review-requests", requireAuth, async (req, res) => {
    try {
    const customer = await storage.getCustomer(req.body.customerId, req.session.accountId!);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const rr = await storage.createReviewRequest({
      ...req.body,
      accountId: req.session.accountId,
      status: "sent",
      sentAt: new Date(),
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
    });
    await storage.updateCustomer(customer.id, { status: "request_sent" }, req.session.accountId!);
    await storage.createActivity({
      id: randomUUID(),
      accountId: req.session.accountId!,
      type: "request_sent",
      customerId: customer.id,
      customerName: customer.name,
      message: `Review request sent to ${customer.name} via ${req.body.channel || customer.channel}`,
      metadata: "{}",
    });

    const channel = req.body.channel || customer.channel;
    const selectedPlatforms: { name: string; url: string }[] = req.body.selectedPlatforms || [];
    const settings = await storage.getSettings(req.session.accountId!);
    const allTemplates = await storage.getTemplates(req.session.accountId!);
    const customMessage: string | undefined = req.body.customMessage || undefined;
    const customSubject: string | undefined = req.body.customSubject || undefined;
    if (settings) {
      if (channel === "email" && customer.email) {
        const template =
          allTemplates.find(t => t.channel === "email" && t.isDefault) ||
          allTemplates.find(t => t.channel === "email") ||
          null;
        const effectiveTemplate = (customMessage || customSubject)
          ? { ...(template || { subject: "", body: "" }), ...(customSubject ? { subject: customSubject } : {}), ...(customMessage ? { body: customMessage } : {}) }
          : template;
        sendReviewEmail(customer, settings, effectiveTemplate, selectedPlatforms).catch(err =>
          console.error("[review request] Failed to send email:", err.message, err.statusCode, JSON.stringify(err.body ?? err))
        );
      } else if (channel === "sms" && customer.phone) {
        const template =
          allTemplates.find(t => t.channel === "sms" && t.isDefault) ||
          allTemplates.find(t => t.channel === "sms") ||
          null;
        const effectiveTemplate = customMessage
          ? { ...(template || { subject: "", body: "" }), body: customMessage }
          : template;
        sendReviewSMS(customer, settings, effectiveTemplate, selectedPlatforms).catch(err =>
          console.error("[review request] Failed to send SMS:", err.message)
        );
      }
    }

    res.json(rr);
    } catch (err: any) {
      console.error("[review-request] Error:", err.message, err.stack);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });
  app.patch("/api/review-requests/:id", requireAuth, async (req, res) => {
    const rr = await storage.updateReviewRequest(String(req.params.id), req.body);
    if (!rr) return res.status(404).json({ message: "Not found" });
    res.json(rr);
  });

  // Reviews (GET — protected; POST is public above)
  app.get("/api/reviews", requireAuth, async (req, res) => {
    res.json(await storage.getReviews(req.session.accountId!));
  });

  // Private Feedback (GET/PATCH — protected; POST is public above)
  app.get("/api/private-feedback", requireAuth, async (req, res) => {
    res.json(await storage.getPrivateFeedback(req.session.accountId!));
  });
  app.patch("/api/private-feedback/:id", requireAuth, async (req, res) => {
    const f = await storage.updatePrivateFeedback(String(req.params.id), req.body);
    if (!f) return res.status(404).json({ message: "Not found" });
    res.json(f);
  });

  // Activity Log
  app.get("/api/activity", requireAuth, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    res.json(await storage.getActivityLog(req.session.accountId!, limit));
  });

  // Templates
  app.get("/api/templates", requireAuth, async (req, res) => {
    res.json(await storage.getTemplates(req.session.accountId!));
  });
  app.post("/api/templates", requireAuth, async (req, res) => {
    const t = await storage.createTemplate({ ...req.body, accountId: req.session.accountId });
    res.json(t);
  });
  app.patch("/api/templates/:id", requireAuth, async (req, res) => {
    const t = await storage.updateTemplate(String(req.params.id), req.body);
    if (!t) return res.status(404).json({ message: "Not found" });
    res.json(t);
  });
  app.post("/api/templates/upload-video", requireAuth, videoUpload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
  app.post("/api/templates/upload-audio", requireAuth, audioUpload.single("audio"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
  app.post("/api/settings/upload-logo", requireAuth, logoUpload.single("logo"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    const s = await storage.getSettings(req.session.accountId!);
    res.json(s || {});
  });
  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.websiteUrl && !body.websiteUrl.startsWith("http")) {
        body.websiteUrl = `https://${body.websiteUrl}`;
      }
      const s = await storage.upsertSettings(req.session.accountId!, body);
      res.json(s);
    } catch (err) {
      console.error("Failed to save settings:", err);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Stats
  app.get("/api/stats", requireAuth, async (req, res) => {
    const stats = await storage.getStats(req.session.accountId!);
    res.json(stats);
  });

  // Analytics
  app.get("/api/analytics", requireAuth, async (req, res) => {
    const accountId = req.session.accountId!;
    const [allCustomers, allReviews] = await Promise.all([
      storage.getCustomers(accountId),
      storage.getReviews(accountId),
    ]);
    const now = new Date();

    // Support either custom from/to or a days rolling window
    let cutoff: Date;
    let cutoffEnd: Date = now;
    let days: number;
    if (req.query.from && req.query.to) {
      cutoff = new Date(req.query.from as string);
      cutoffEnd = new Date(req.query.to as string);
      cutoffEnd.setHours(23, 59, 59, 999);
      days = Math.ceil((cutoffEnd.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
    } else {
      days = parseInt((req.query.days as string) || "30");
      cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const channel = (req.query.channel as string) || "all";

    const sentCustomers = allCustomers.filter(c =>
      c.status !== "pending_request" &&
      c.createdAt >= cutoff && c.createdAt <= cutoffEnd &&
      (channel === "all" || c.channel === channel)
    );
    const periodReviews = allReviews.filter(r =>
      r.createdAt >= cutoff && r.createdAt <= cutoffEnd
    );

    // Daily chart
    const dailyData: Record<string, { date: string; requests: number; reviews: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(cutoff.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { date: key, requests: 0, reviews: 0 };
    }
    sentCustomers.forEach(c => {
      const key = c.createdAt.toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].requests++;
    });
    periodReviews.forEach(r => {
      const key = r.createdAt.toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].reviews++;
    });

    const sent = sentCustomers.length;
    const clicked = sentCustomers.filter(c => c.status === "clicked" || c.status === "review_completed").length;
    const completed = sentCustomers.filter(c => c.status === "review_completed").length;

    const channelBreakdown = { email: 0, sms: 0, whatsapp: 0 };
    sentCustomers.forEach(c => {
      const ch = c.channel as keyof typeof channelBreakdown;
      if (channelBreakdown[ch] !== undefined) channelBreakdown[ch]++;
    });

    const starBreakdown = [1, 2, 3, 4, 5].map(s => ({
      stars: s,
      count: periodReviews.filter(r => r.stars === s).length,
    }));

    const avgRating = periodReviews.length > 0
      ? Math.round((periodReviews.reduce((sum, r) => sum + r.stars, 0) / periodReviews.length) * 10) / 10
      : 0;

    res.json({
      daily: Object.values(dailyData),
      funnel: { sent, clicked, completed },
      channelBreakdown,
      starBreakdown,
      summary: { sent, reviews: periodReviews.length, avgRating, responseRate: sent > 0 ? Math.round((completed / sent) * 100) : 0 },
    });
  });

  // Social OAuth (protected)
  let oauthState = "";

  app.get("/auth/facebook", requireAuth, async (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return res.status(400).send("Facebook App ID not configured on the server.");
    oauthState = randomUUID();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: `${process.env.APP_URL || "http://localhost:5000"}/auth/facebook/callback`,
      scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
      state: oauthState,
      response_type: "code",
    });
    res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
  });

  app.get("/auth/facebook/callback", async (req, res) => {
    const { code, state } = req.query as { code: string; state: string };
    if (state !== oauthState) return res.status(400).send("Invalid OAuth state.");
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) return res.status(500).send("Facebook credentials not configured on server.");
    const accountId = req.session.accountId;
    if (!accountId) return res.status(401).send("Not authenticated.");
    try {
      const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: `${process.env.APP_URL || "http://localhost:5000"}/auth/facebook/callback`,
          code,
        }),
      });
      const tokenData = await tokenRes.json() as { access_token: string };
      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
      const pagesData = await pagesRes.json() as { data: Array<{ access_token: string; id: string }> };
      if (!pagesData.data?.length) return res.status(400).send("No Facebook Pages found on this account.");
      const page = pagesData.data[0];
      await storage.upsertSettings(accountId, { facebookPageAccessToken: page.access_token, facebookPageId: page.id });
      res.redirect(`${process.env.APP_URL || "http://localhost:5000"}/?tab=settings&connected=facebook`);
    } catch (err) {
      console.error("Facebook OAuth error:", err);
      res.status(500).send("Facebook OAuth failed. Check server logs.");
    }
  });

  app.delete("/api/social/facebook", requireAuth, async (req, res) => {
    await storage.upsertSettings(req.session.accountId!, { facebookPageAccessToken: "", facebookPageId: "" });
    res.json({ success: true });
  });

  app.get("/auth/linkedin", requireAuth, async (req, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) return res.status(400).send("LinkedIn Client ID not configured on the server.");
    oauthState = randomUUID();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: `${process.env.APP_URL || "http://localhost:5000"}/auth/linkedin/callback`,
      scope: "w_member_social,r_organization_social",
      state: oauthState,
    });
    res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
  });

  app.get("/auth/linkedin/callback", async (req, res) => {
    const { code, state } = req.query as { code: string; state: string };
    if (state !== oauthState) return res.status(400).send("Invalid OAuth state.");
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).send("LinkedIn credentials not configured on server.");
    const accountId = req.session.accountId;
    if (!accountId) return res.status(401).send("Not authenticated.");
    try {
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${process.env.APP_URL || "http://localhost:5000"}/auth/linkedin/callback`,
        }),
      });
      const tokenData = await tokenRes.json() as { access_token: string };
      const orgsRes = await fetch("https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const orgsData = await orgsRes.json() as { elements: Array<{ organization: string }> };
      let orgId = "";
      if (orgsData.elements?.length) {
        const urn = orgsData.elements[0].organization;
        orgId = urn.split(":").pop() || "";
      }
      await storage.upsertSettings(accountId, { linkedinAccessToken: tokenData.access_token, linkedinOrganizationId: orgId });
      res.redirect(`${process.env.APP_URL || "http://localhost:5000"}/?tab=settings&connected=linkedin`);
    } catch (err) {
      console.error("LinkedIn OAuth error:", err);
      res.status(500).send("LinkedIn OAuth failed. Check server logs.");
    }
  });

  app.delete("/api/social/linkedin", requireAuth, async (req, res) => {
    await storage.upsertSettings(req.session.accountId!, { linkedinAccessToken: "", linkedinOrganizationId: "" });
    res.json({ success: true });
  });

  return httpServer;
}
