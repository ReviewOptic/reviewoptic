import express from "express";
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
  // Block members from editing settings or deleting/editing customers
  if (req.session.userRole === "member") {
    const blocked =
      (req.path.startsWith("/api/settings") && req.method !== "GET") ||
      (req.path.match(/\/api\/customers\/[^/]+$/) && ["PATCH", "DELETE"].includes(req.method));
    if (blocked) return res.status(403).json({ message: "Team members cannot make this change." });
  }
  // Enforce payment — free plan users (non-admin, non-impersonated) cannot access protected routes
  if (req.path.startsWith("/api/billing/")) return next();
  storage.getUser(req.session.userId).then(async user => {
    if (!user) return res.status(401).json({ message: "User not found" });
    // Block deactivated members
    if (req.session.userRole === "member") {
      try {
        const { rows: ar } = await pool.query(`SELECT is_active FROM users WHERE id = $1`, [user.id]);
        if (ar[0]?.is_active === false) {
          return res.status(403).json({ message: "Your account has been deactivated. Please contact your account owner." });
        }
      } catch { /* column may not exist on older installs */ }
    }
    const isAdmin = user.isAdmin;
    const isImpersonating = !!req.session.originalUserId;
    if (!isAdmin && !isImpersonating) {
      // For members, check the account owner's plan instead of their own
      const planQuery = req.session.userRole === "member"
        ? pool.query(`SELECT plan_type FROM users WHERE account_id = $1 AND role = 'owner' LIMIT 1`, [req.session.accountId])
        : pool.query(`SELECT plan_type FROM users WHERE id = $1`, [user.id]);
      planQuery.then(({ rows }) => {
        const planType = rows[0]?.plan_type || "free";
        if (planType === "free") return res.status(402).json({ message: "Subscription required" });
        // Cancelled plan — analytics read-only
        if (planType === "cancelled") {
          const isAnalyticsRead = req.path === "/api/analytics" && req.method === "GET";
          const isSettingsRead = req.path === "/api/settings" && req.method === "GET";
          if (!isAnalyticsRead && !isSettingsRead) {
            return res.status(402).json({ message: "Your subscription has ended. Please reactivate to regain access.", code: "subscription_ended" });
          }
        }
        next();
      }).catch(() => next());
    } else {
      next();
    }
  }).catch(() => res.status(500).json({ message: "Server error" }));
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
        const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
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
      businessEmail: email.toLowerCase(),
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

    // Auto-login so user can proceed to billing immediately
    req.session.userId = user.id;
    req.session.accountId = user.accountId;
    await new Promise<void>((resolve) => req.session.save(() => resolve()));

    // Verification email is sent AFTER payment, not here
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

    if (!user.isAdmin) {
      const { rows } = await pool.query(`SELECT plan_type, role FROM users WHERE id = $1`, [user.id]);
      const planType = rows[0]?.plan_type || "free";
      const role = rows[0]?.role || "owner";
      // Members inherit the owner's plan — check account owner instead
      if (role === "member") {
        const { rows: ownerRows } = await pool.query(
          `SELECT plan_type FROM users WHERE account_id = $1 AND role = 'owner' LIMIT 1`,
          [user.accountId]
        );
        const ownerPlan = ownerRows[0]?.plan_type || "free";
        if (ownerPlan === "free") {
          return res.status(403).json({ message: "The account owner hasn't set up a subscription yet." });
        }
      } else if (planType === "free") {
        return res.status(403).json({ message: "Please complete your subscription before signing in." });
      }
    }

    const { rows: profileRows } = await pool.query(
      `SELECT role, plan_type, plan_period, first_name, last_name, company_name FROM users WHERE id = $1`, [user.id]
    );
    const profile = profileRows[0] || {};
    const role = profile.role || "owner";
    req.session.userId = user.id;
    req.session.accountId = user.accountId;
    (req.session as any).userRole = role;
    delete req.session.originalUserId;
    delete req.session.originalAccountId;
    res.json({
      id: user.id,
      email: user.email,
      accountId: user.accountId,
      isAdmin: user.isAdmin,
      isImpersonating: false,
      planType: profile.plan_type || "free",
      planPeriod: profile.plan_period || "monthly",
      requiresPayment: !user.isAdmin && (profile.plan_type || "free") === "free" && role === "owner",
      emailVerified: user.emailVerified,
      role,
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      companyName: profile.company_name || "",
    });
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
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
    const verifyUrl = `${appUrl}/verify-email?token=${newToken}`;
    await sendVerificationEmail(user.email, verifyUrl).catch(err =>
      console.error("[resend-verification] Failed to send email:", err.message)
    );
    res.json({ success: true });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session.userId;
    if (userId) {
      await pool.query(`DELETE FROM chat_messages WHERE user_id = $1`, [userId]).catch(() => {});
    }
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
      const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
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
    // Fetch billing fields separately (added via migration, not in Drizzle schema yet)
    let billing: any = {};
    try {
      const { rows } = await pool.query(
        `SELECT plan_type, plan_period, role, first_name, last_name, company_name FROM users WHERE id = $1`,
        [user.id]
      );
      billing = rows[0] || {};
    } catch { /* columns may not exist yet — safe to ignore */ }
    const planType = billing.plan_type || "free";
    const role = billing.role || "owner";
    res.json({
      id: user.id,
      email: user.email,
      accountId: user.accountId,
      isAdmin: user.isAdmin,
      isImpersonating: !!req.session.originalUserId,
      planType,
      planPeriod: billing.plan_period || "monthly",
      requiresPayment: !user.isAdmin && planType === "free" && role === "owner" && !req.session.originalUserId,
      emailVerified: user.emailVerified,
      role,
      firstName: billing.first_name || "",
      lastName: billing.last_name || "",
      companyName: billing.company_name || "",
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
    const { rows: planRows } = await pool.query(`SELECT id, plan_type FROM users`);
    const planMap = Object.fromEntries(planRows.map((r: any) => [r.id, r.plan_type]));
    const statsMap = Object.fromEntries(stats.map(s => [s.userId, s]));
    const activeUsers = allUsers.filter(u => {
      if (u.isAdmin) return true;
      const plan = planMap[u.id] || "free";
      return u.emailVerified && plan !== "free";
    });
    res.json(activeUsers.map(u => ({
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
        planBreakdownR,
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
        pool.query(`SELECT plan_type, plan_period, COUNT(*) as count FROM users WHERE NOT is_admin AND plan_type NOT IN ('free', 'complimentary') GROUP BY plan_type, plan_period ORDER BY plan_type, plan_period`),
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
          planBreakdown: planBreakdownR.rows.map((r: any) => ({
            planType: r.plan_type,
            planPeriod: r.plan_period,
            count: parseInt(r.count),
          })),
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

  // Public Trustpilot reviews for login page ticker
  // Returns real reviews when TRUSTPILOT_API_KEY + TRUSTPILOT_BUSINESS_UNIT_ID are set, else placeholders
  app.get("/api/public/trustpilot-reviews", async (_req, res) => {
    const PLACEHOLDER_REVIEWS = [
      { id: "1", stars: 5, text: "ReviewOptic has completely transformed how we collect Google reviews. Went from 12 reviews to over 80 in just two months!", author: "Sarah Mitchell" },
      { id: "2", stars: 5, text: "Simple to set up, works brilliantly. Our customers actually respond and our rating has gone from 4.1 to 4.8.", author: "James Thornton" },
      { id: "3", stars: 5, text: "The automated follow-ups are a game changer. We were leaving so many reviews on the table before. Highly recommend.", author: "Priya Patel" },
      { id: "4", stars: 5, text: "We've tried other review tools but ReviewOptic is by far the easiest. Set it up in an afternoon and it just works.", author: "David Okafor" },
      { id: "5", stars: 5, text: "Our Trustpilot score jumped from 3.9 to 4.7 within 6 weeks of using ReviewOptic. Brilliant product.", author: "Emma Clarke" },
      { id: "6", stars: 5, text: "The team loved how easy it is to send requests right from the customer list. No faff, no training needed.", author: "Tom Ashworth" },
    ];

    const apiKey = process.env.TRUSTPILOT_API_KEY;
    const businessUnitId = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;

    if (!apiKey || !businessUnitId) {
      return res.json({ reviews: PLACEHOLDER_REVIEWS, source: "placeholder" });
    }

    try {
      const response = await fetch(
        `https://api.trustpilot.com/v1/business-units/${businessUnitId}/reviews?apikey=${apiKey}&stars=5&perPage=20`,
        { headers: { Accept: "application/json" } }
      );
      if (!response.ok) throw new Error(`Trustpilot API ${response.status}`);
      const data = await response.json() as any;
      const reviews = (data.reviews || []).slice(0, 20).map((r: any) => ({
        id: r.id,
        stars: r.stars,
        text: (r.text?.text || "").slice(0, 160),
        author: r.consumer?.displayName || "Verified Customer",
      }));
      res.json({ reviews: reviews.length ? reviews : PLACEHOLDER_REVIEWS, source: "trustpilot" });
    } catch (err) {
      console.error("[trustpilot-reviews]", err);
      res.json({ reviews: PLACEHOLDER_REVIEWS, source: "placeholder" });
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

  app.post("/api/ai/generate-template", requireAuth, async (req, res) => {
    try {
      const { channel } = req.body;
      const settings = await storage.getSettings(req.session.accountId!);
      const businessName = settings?.businessName || "our business";

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "OpenAI API key not configured" });
      }

      const isSMS = channel === "sms" || channel === "whatsapp";
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      if (isSMS) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Write a friendly SMS review request template for a business called "${businessName}". Use {{first_name}}, {{business_name}}, and {{review_link}} merge tags. Keep it under 160 characters. Just the message text.` }],
          max_tokens: 200,
        });
        res.json({ body: completion.choices[0]?.message?.content?.trim() || "", subject: "" });
      } else {
        const [bodyCompletion, subjectCompletion] = await Promise.all([
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Write a friendly email review request template for "${businessName}". Use {{first_name}}, {{business_name}}, {{service_type}}, and {{review_link}} merge tags. 3–4 sentences. Start with "Hi {{first_name}}," — just the body text, no subject line, no sign-off.` }],
            max_tokens: 300,
          }),
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Write a short email subject line for a review request from "${businessName}". Use {{business_name}} if appropriate. Just the subject text, no quotes.` }],
            max_tokens: 60,
          }),
        ]);
        res.json({
          body: bodyCompletion.choices[0]?.message?.content?.trim() || "",
          subject: subjectCompletion.choices[0]?.message?.content?.trim() || "",
        });
      }
    } catch (err: any) {
      console.error("[ai/generate-template]", err.message);
      res.status(500).json({ message: "Failed to generate template" });
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
    // Track who sent this request and which template was used
    await pool.query(`UPDATE review_requests SET sent_by_user_id = $1 WHERE id = $2`, [req.session.userId, rr.id]).catch(() => {});
    const templateId: string | undefined = req.body.templateId || undefined;
    if (templateId) {
      await pool.query(`UPDATE review_requests SET template_id = $1 WHERE id = $2`, [templateId, rr.id]).catch(() => {});
    }
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
          (templateId && allTemplates.find(t => t.id === templateId)) ||
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
          (templateId && allTemplates.find(t => t.id === templateId)) ||
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
  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    await storage.deleteTemplate(String(req.params.id), req.session.accountId!);
    res.json({ success: true });
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
      // Sync ownerName → users.first_name / last_name so analytics displays correctly
      if (body.ownerName) {
        const parts = (body.ownerName as string).trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ");
        await pool.query(
          `UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3`,
          [firstName, lastName, req.session.userId]
        );
      }
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
    const userId = req.query.userId as string | undefined;

    // If filtering by user, get customer IDs from their review_requests
    let userCustomerIds: Set<string> | null = null;
    if (userId) {
      try {
        const { rows: rr } = await pool.query(
          `SELECT DISTINCT customer_id FROM review_requests WHERE account_id=$1 AND sent_by_user_id=$2 AND created_at>=$3 AND created_at<=$4`,
          [accountId, userId, cutoff, cutoffEnd]
        );
        userCustomerIds = new Set(rr.map((r: any) => r.customer_id));
      } catch { /* ignore */ }
    }

    const sentCustomers = allCustomers.filter(c =>
      c.status !== "pending_request" &&
      c.createdAt >= cutoff && c.createdAt <= cutoffEnd &&
      (channel === "all" || c.channel === channel) &&
      (!userCustomerIds || userCustomerIds.has(c.id))
    );
    const periodReviews = allReviews.filter(r =>
      r.createdAt >= cutoff && r.createdAt <= cutoffEnd
    );

    // Daily chart
    const dailyData: Record<string, { date: string; requests: number; reviews: number }> = {};
    const allChannelCustomers = allCustomers.filter(c =>
      c.status !== "pending_request" &&
      c.createdAt >= cutoff && c.createdAt <= cutoffEnd
    );
    const channelDailyData: Record<string, { date: string; email: number; sms: number; whatsapp: number; emailReviews: number; smsReviews: number; whatsappReviews: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(cutoff.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { date: key, requests: 0, reviews: 0 };
      channelDailyData[key] = { date: key, email: 0, sms: 0, whatsapp: 0, emailReviews: 0, smsReviews: 0, whatsappReviews: 0 };
    }
    sentCustomers.forEach(c => {
      const key = c.createdAt.toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].requests++;
    });
    allChannelCustomers.forEach(c => {
      const key = c.createdAt.toISOString().split("T")[0];
      if (channelDailyData[key]) {
        const ch = c.channel as string;
        if (ch === "email") channelDailyData[key].email++;
        else if (ch === "sms") channelDailyData[key].sms++;
        else if (ch === "whatsapp") channelDailyData[key].whatsapp++;
      }
    });
    periodReviews.forEach(r => {
      const key = r.createdAt.toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].reviews++;
    });
    // Map customer_id → channel from all review_requests in period
    try {
      const { rows: rrRows } = await pool.query(
        `SELECT DISTINCT ON (customer_id) customer_id, channel, created_at
         FROM review_requests WHERE account_id=$1 ORDER BY customer_id, created_at DESC`,
        [accountId]
      );
      const customerChannel: Record<string, string> = {};
      rrRows.forEach((r: any) => { customerChannel[r.customer_id] = r.channel; });
      periodReviews.forEach(r => {
        const key = r.createdAt.toISOString().split("T")[0];
        const ch = customerChannel[r.customerId];
        if (channelDailyData[key]) {
          if (ch === "email") channelDailyData[key].emailReviews++;
          else if (ch === "sms") channelDailyData[key].smsReviews++;
          else if (ch === "whatsapp") channelDailyData[key].whatsappReviews++;
        }
      });
    } catch { /* ignore */ }

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

    // Per-user breakdown (owner only)
    let byUser: any[] = [];
    try {
      const { rows: userRows } = await pool.query(`
        SELECT u.first_name, u.last_name, u.email, u.role,
               COUNT(rr.id) as requests_sent,
               COUNT(CASE WHEN rr.status = 'review_completed' THEN 1 END) as responses
        FROM users u
        LEFT JOIN review_requests rr ON rr.sent_by_user_id = u.id
          AND rr.account_id = $1
          AND rr.created_at >= $2 AND rr.created_at <= $3
        WHERE u.account_id = $1
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
        ORDER BY requests_sent DESC
      `, [accountId, cutoff, cutoffEnd]);
      byUser = userRows.map(r => ({
        name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email,
        email: r.email,
        role: r.role,
        requestsSent: parseInt(r.requests_sent) || 0,
        responses: parseInt(r.responses) || 0,
      }));
    } catch { /* column may not exist on older installs */ }

    // Best day to send
    let bestDayData: any[] = [];
    try {
      const { rows: dowRows } = await pool.query(`
        SELECT EXTRACT(DOW FROM created_at)::int as dow,
               COUNT(*) as requests_sent,
               COUNT(CASE WHEN status = 'review_completed' THEN 1 END) as reviews_completed
        FROM review_requests
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY dow ORDER BY dow
      `, [accountId, cutoff, cutoffEnd]);
      const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      bestDayData = DOW_NAMES.map((name, i) => {
        const row = dowRows.find((r: any) => r.dow === i);
        const sent = parseInt(row?.requests_sent || "0");
        const completed = parseInt(row?.reviews_completed || "0");
        return { day: name, requestsSent: sent, reviewsCompleted: completed, conversionRate: sent > 0 ? Math.round((completed / sent) * 100) : 0 };
      });
    } catch { /* ignore */ }

    // Average time to review
    let timeToReviewData: any[] = [];
    try {
      const { rows: ttrRows } = await pool.query(`
        SELECT
          CASE
            WHEN r.created_at - rr.first_sent < INTERVAL '1 day' THEN 'Same day'
            WHEN r.created_at - rr.first_sent < INTERVAL '2 days' THEN '1 day'
            WHEN r.created_at - rr.first_sent < INTERVAL '4 days' THEN '2-3 days'
            WHEN r.created_at - rr.first_sent < INTERVAL '8 days' THEN '4-7 days'
            ELSE '7+ days'
          END as bucket,
          COUNT(*) as count
        FROM reviews r
        JOIN (
          SELECT customer_id, MIN(created_at) as first_sent
          FROM review_requests WHERE account_id = $1
          GROUP BY customer_id
        ) rr ON rr.customer_id = r.customer_id
        WHERE r.account_id = $1 AND r.created_at >= $2 AND r.created_at <= $3
        GROUP BY bucket
      `, [accountId, cutoff, cutoffEnd]);
      const BUCKETS = ["Same day", "1 day", "2-3 days", "4-7 days", "7+ days"];
      timeToReviewData = BUCKETS.map(bucket => ({
        bucket,
        count: parseInt(ttrRows.find((r: any) => r.bucket === bucket)?.count || "0"),
      }));
    } catch { /* ignore */ }

    // Follow-up effectiveness
    let followUpData: any[] = [];
    try {
      const { rows: fuRows } = await pool.query(`
        SELECT
          CASE
            WHEN rr_count = 1 THEN 'No follow-up'
            WHEN rr_count = 2 THEN '1 follow-up'
            ELSE '2+ follow-ups'
          END as bucket,
          COUNT(*) as customers,
          COUNT(CASE WHEN has_review THEN 1 END) as converted
        FROM (
          SELECT customer_id,
                 COUNT(id) as rr_count,
                 bool_or(status = 'review_completed') as has_review
          FROM review_requests
          WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
          GROUP BY customer_id
        ) t
        GROUP BY bucket
        ORDER BY bucket
      `, [accountId, cutoff, cutoffEnd]);
      const FU_BUCKETS = ["No follow-up", "1 follow-up", "2+ follow-ups"];
      followUpData = FU_BUCKETS.map(bucket => {
        const row = fuRows.find((r: any) => r.bucket === bucket);
        const customers = parseInt(row?.customers || "0");
        const converted = parseInt(row?.converted || "0");
        return { bucket, customers, converted, conversionRate: customers > 0 ? Math.round((converted / customers) * 100) : 0 };
      });
    } catch { /* ignore */ }

    // Template performance
    let templatePerformance: any[] = [];
    try {
      const { rows: tplRows } = await pool.query(`
        SELECT t.name as template_name,
               COUNT(rr.id) as total_sent,
               COUNT(CASE WHEN rr.status = 'review_completed' THEN 1 END) as reviews_completed
        FROM templates t
        LEFT JOIN review_requests rr ON rr.template_id = t.id
          AND rr.account_id = $1
          AND rr.created_at >= $2 AND rr.created_at <= $3
        WHERE t.account_id = $1
        GROUP BY t.id, t.name
        HAVING COUNT(rr.id) > 0
        ORDER BY reviews_completed DESC
      `, [accountId, cutoff, cutoffEnd]);
      templatePerformance = tplRows.map((r: any) => ({
        name: r.template_name,
        sent: parseInt(r.total_sent),
        completed: parseInt(r.reviews_completed),
        responseRate: parseInt(r.total_sent) > 0 ? Math.round((parseInt(r.reviews_completed) / parseInt(r.total_sent)) * 100) : 0,
      }));
    } catch { /* ignore */ }

    // Review platform breakdown
    let platformBreakdown: any[] = [];
    try {
      const { rows: platformRows } = await pool.query(`
        SELECT platform, COUNT(*) as count
        FROM reviews
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY platform ORDER BY count DESC
      `, [accountId, cutoff, cutoffEnd]);
      platformBreakdown = platformRows.map((r: any) => ({
        name: r.platform.charAt(0).toUpperCase() + r.platform.slice(1),
        value: parseInt(r.count),
      }));
    } catch { /* ignore */ }

    res.json({
      daily: Object.values(dailyData),
      dailyByChannel: Object.values(channelDailyData),
      funnel: { sent, clicked, completed },
      channelBreakdown,
      starBreakdown,
      summary: { sent, reviews: periodReviews.length, avgRating, responseRate: sent > 0 ? Math.round((completed / sent) * 100) : 0 },
      byUser,
      bestDayData,
      timeToReviewData,
      followUpData,
      templatePerformance,
      platformBreakdown,
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
      redirect_uri: `${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/auth/facebook/callback`,
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
          redirect_uri: `${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/auth/facebook/callback`,
          code,
        }),
      });
      const tokenData = await tokenRes.json() as { access_token: string };
      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
      const pagesData = await pagesRes.json() as { data: Array<{ access_token: string; id: string }> };
      if (!pagesData.data?.length) return res.status(400).send("No Facebook Pages found on this account.");
      const page = pagesData.data[0];
      await storage.upsertSettings(accountId, { facebookPageAccessToken: page.access_token, facebookPageId: page.id });
      res.redirect(`${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/?tab=settings&connected=facebook`);
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
      redirect_uri: `${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/auth/linkedin/callback`,
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
          redirect_uri: `${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/auth/linkedin/callback`,
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
      res.redirect(`${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/?tab=settings&connected=linkedin`);
    } catch (err) {
      console.error("LinkedIn OAuth error:", err);
      res.status(500).send("LinkedIn OAuth failed. Check server logs.");
    }
  });

  app.delete("/api/social/linkedin", requireAuth, async (req, res) => {
    await storage.upsertSettings(req.session.accountId!, { linkedinAccessToken: "", linkedinOrganizationId: "" });
    res.json({ success: true });
  });

  // ── Billing / Stripe ──────────────────────────────────────────────────────

  const PRICES: Record<string, { unit_amount: number; interval: "month" | "year"; name: string }> = {
    standard_monthly: { unit_amount: 4900,   interval: "month", name: "Standard Plan (Monthly)" },
    standard_annual:  { unit_amount: 53900,  interval: "year",  name: "Standard Plan (Annual)" },
    agency_monthly:   { unit_amount: 14900,  interval: "month", name: "Agency Plan (Monthly)" },
    agency_annual:    { unit_amount: 163900, interval: "year",  name: "Agency Plan (Annual)" },
  };

  app.get("/api/billing/config", (_req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
  });

  app.post("/api/billing/create-checkout-session", requireAuth, async (req, res) => {
    const { plan, period } = req.body;
    const key = `${plan}_${period}`;
    if (!PRICES[key]) return res.status(400).json({ message: "Invalid plan or period" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe is not configured" });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "User not found" });

    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}` || "http://localhost:5000";
    const price = PRICES[key];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      ui_mode: "embedded",
      line_items: [{
        price_data: {
          currency: "gbp",
          unit_amount: price.unit_amount,
          recurring: { interval: price.interval },
          product_data: { name: price.name },
        },
        quantity: 1,
      }],
      return_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId: user.id, plan, period },
    });

    res.json({ clientSecret: session.client_secret });
  });

  app.get("/api/billing/confirm", requireAuth, async (req, res) => {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId) return res.status(400).json({ message: "Missing session_id" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const { plan, period, userId } = session.metadata || {};
    if (!plan || !period || !PRICES[`${plan}_${period}`]) {
      return res.status(400).json({ message: "Invalid session metadata" });
    }
    if (userId !== req.session.userId) {
      return res.status(403).json({ message: "Session does not belong to this user" });
    }

    const customerId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id ?? "";
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id ?? "";

    await pool.query(
      `UPDATE users SET plan_type = $1, plan_period = $2, stripe_customer_id = $3, stripe_subscription_id = $4 WHERE id = $5`,
      [plan, period, customerId, subscriptionId, userId]
    );

    // Send verification email now that payment is confirmed
    const { rows: userRows } = await pool.query(`SELECT email, verification_token, email_verified FROM users WHERE id = $1`, [userId]);
    const paidUser = userRows[0];
    if (paidUser && !paidUser.email_verified && paidUser.verification_token) {
      const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
      const verifyUrl = `${appUrl}/verify-email?token=${paidUser.verification_token}`;
      await sendVerificationEmail(paidUser.email, verifyUrl).catch(err =>
        console.error("[billing/confirm] Failed to send verification email:", err.message)
      );
    }

    res.json({ success: true, plan, period });
  });

  app.get("/api/billing/status", requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT plan_type, plan_period, stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1`,
      [req.session.userId]
    );
    const row = rows[0] || {};
    res.json({
      planType: row.plan_type || "free",
      planPeriod: row.plan_period || "monthly",
      stripeCustomerId: row.stripe_customer_id || null,
      stripeSubscriptionId: row.stripe_subscription_id || null,
    });
  });

  app.get("/api/billing/subscription", requireAuth, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
    const { rows } = await pool.query(
      `SELECT plan_type, plan_period, stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1`,
      [req.session.userId]
    );
    const row = rows[0] || {};
    if (!row.stripe_subscription_id) return res.json({ subscription: null });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id) as any;

    // If Stripe says the subscription is fully cancelled, mark the user as cancelled in our DB
    if (sub.status === "canceled" && row.plan_type !== "cancelled" && row.plan_type !== "free" && row.plan_type !== "complimentary") {
      await pool.query(`UPDATE users SET plan_type = 'cancelled' WHERE id = $1`, [req.session.userId]);
    }

    res.json({
      subscription: {
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        planType: row.plan_type,
        planPeriod: row.plan_period,
      },
    });
  });

  app.get("/api/billing/invoices", requireAuth, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
    const { rows } = await pool.query(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [req.session.userId]
    );
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return res.json({ invoices: [] });

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { data } = await stripe.invoices.list({ customer: customerId, limit: 10 });
    res.json({
      invoices: data.map(inv => ({
        id: inv.id,
        number: inv.number,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        created: inv.created,
        pdfUrl: inv.invoice_pdf,
      })),
    });
  });

  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
      const { rows } = await pool.query(
        `SELECT stripe_customer_id FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const customerId = rows[0]?.stripe_customer_id;
      if (!customerId) return res.status(400).json({ message: "No billing account found. Please contact support." });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}` || "http://localhost:5000";
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/billing`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      const msg = err?.raw?.message || err?.message || "Failed to open billing portal";
      console.error("[billing/portal] Error:", msg);
      res.status(500).json({ message: msg });
    }
  });

  // Cancel subscription at period end
  app.post("/api/billing/cancel", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
      const { rows } = await pool.query(`SELECT stripe_subscription_id FROM users WHERE id = $1`, [req.session.userId]);
      const subscriptionId = rows[0]?.stripe_subscription_id;
      if (!subscriptionId) return res.status(400).json({ message: "No active subscription found" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true }) as any;

      // Send cancellation email
      const { rows: userRows } = await pool.query(`SELECT email, first_name FROM users WHERE id = $1`, [req.session.userId]);
      const u = userRows[0];
      if (u) {
        const endDate = new Date(sub.current_period_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
        const { sendCancellationEmail } = await import("./email");
        sendCancellationEmail(u.email, u.first_name || "", endDate, `${appUrl}/billing`).catch(err =>
          console.error("[billing/cancel] Failed to send cancellation email:", err.message)
        );
      }

      res.json({ cancelAtPeriodEnd: sub.cancel_at_period_end, currentPeriodEnd: sub.current_period_end });
    } catch (err: any) {
      console.error("[billing/cancel]", err.message);
      res.status(500).json({ message: err?.raw?.message || err.message || "Failed to cancel subscription" });
    }
  });

  // Reactivate subscription (undo cancel_at_period_end)
  app.post("/api/billing/reactivate", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
      const { rows } = await pool.query(`SELECT stripe_subscription_id FROM users WHERE id = $1`, [req.session.userId]);
      const subscriptionId = rows[0]?.stripe_subscription_id;
      if (!subscriptionId) return res.status(400).json({ message: "No subscription found" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false }) as any;
      res.json({ cancelAtPeriodEnd: sub.cancel_at_period_end, currentPeriodEnd: sub.current_period_end });
    } catch (err: any) {
      console.error("[billing/reactivate]", err.message);
      res.status(500).json({ message: err?.raw?.message || err.message || "Failed to reactivate subscription" });
    }
  });

  // Stripe webhook — handles subscription cancellations asynchronously
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).send("Stripe not configured");

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let event: any;
    const sig = req.headers["stripe-signature"] as string;
    const rawBody = (req as any).rawBody || req.body;

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch {
        return res.status(400).send("Webhook signature verification failed");
      }
    } else {
      event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    }

    if (event.type === "customer.subscription.deleted") {
      await pool.query(
        `UPDATE users SET plan_type = 'cancelled', plan_period = 'monthly' WHERE stripe_subscription_id = $1`,
        [event.data.object.id]
      );
    }

    res.json({ received: true });
  });

  // Chat history
  app.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const WINDOW_MS = 5 * 60 * 1000;
      const LIMIT = 4;
      const windowStart = new Date(Date.now() - WINDOW_MS);

      const { rows } = await pool.query(
        `SELECT id, message, response, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC`,
        [req.session.userId]
      );

      const usedInWindow = rows.filter(r => new Date(r.created_at) >= windowStart).length;
      res.json({ messages: rows, usedInWindow, limit: LIMIT });
    } catch (err: any) {
      console.error("[chat/history] Error:", err.message);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // Chat
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ message: "message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI not configured" });
      }

      const userId = req.session.userId!;
      const WINDOW_MS = 5 * 60 * 1000;
      const LIMIT = 4;
      const windowStart = new Date(Date.now() - WINDOW_MS);

      // Count messages in the last 15 minutes
      const { rows: windowRows } = await pool.query(
        `SELECT created_at FROM chat_messages WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at ASC`,
        [userId, windowStart]
      );

      if (windowRows.length >= LIMIT) {
        // Cooldown expires when the oldest message in the window turns 15 mins old
        const oldestAt = new Date(windowRows[0].created_at).getTime();
        const availableAt = oldestAt + WINDOW_MS;
        const remainingMs = availableAt - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return res.status(429).json({
          message: `You've reached your limit. New questions available in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
          retryAfterMinutes: remainingMinutes,
          usedInWindow: windowRows.length,
          limit: LIMIT,
        });
      }

      // Fetch business name for the system prompt
      const settings = await storage.getSettings(req.session.accountId!);
      const businessName = settings?.businessName || "this business";

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You help ${businessName} get more customer reviews. Only answer questions about reviews, testimonials, and reputation management. Keep answers short and practical.`,
          },
          { role: "user", content: message.trim() },
        ],
        max_tokens: 400,
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response.";

      await pool.query(
        `INSERT INTO chat_messages (id, user_id, message, response) VALUES ($1, $2, $3, $4)`,
        [randomUUID(), userId, message.trim(), aiResponse]
      );

      const usedInWindow = windowRows.length + 1;
      res.json({ response: aiResponse, usedInWindow, limit: LIMIT });
    } catch (err: any) {
      console.error("[chat] Error:", err.message, err.status, err.code);
      // Return a friendly message — don't expose raw OpenAI errors to the user
      const isRateLimit = err.status === 429 || (err.message || "").toLowerCase().includes("rate limit");
      const friendly = isRateLimit
        ? "The AI is temporarily busy. Please try again in a moment."
        : "Something went wrong. Please try again.";
      res.status(500).json({ message: friendly });
    }
  });

  // ── Team management ──────────────────────────────────────────────────────

  // List team members
  app.get("/api/team", requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, role, email_verified, invite_token,
              is_active, last_insight_email_at as last_active
       FROM users WHERE account_id = $1 AND id != $2 AND role = 'member' ORDER BY created_at ASC`,
      [req.session.accountId, req.session.userId]
    );
    res.json(rows);
  });

  // Toggle team member active/inactive
  app.patch("/api/team/:userId/active", requireAuth, async (req, res) => {
    if (req.session.userRole === "member") {
      return res.status(403).json({ message: "Only the account owner can do this." });
    }
    const { userId } = req.params;
    const { active } = req.body;
    await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND account_id = $3 AND role = 'member'`,
      [active, userId, req.session.accountId]
    );
    res.json({ ok: true });
  });

  // Invite a team member
  app.post("/api/team/invite", requireAuth, async (req, res) => {
    if (req.session.userRole === "member") {
      return res.status(403).json({ message: "Only the account owner can invite team members." });
    }
    const { email, firstName, lastName } = req.body;
    if (!email || !firstName) return res.status(400).json({ message: "Email and first name are required" });

    // Check not already a user in this account
    const { rows: existing } = await pool.query(
      `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing.length > 0) return res.status(400).json({ message: "A user with this email already exists." });

    // Get owner info for the email
    const { rows: ownerRows } = await pool.query(
      `SELECT first_name, last_name, plan_type, plan_period FROM users WHERE id = $1`, [req.session.userId]
    );
    const owner = ownerRows[0];
    const settings = await storage.getSettings(req.session.accountId!);
    const companyName = settings?.businessName || "your company";

    const inviteToken = randomUUID();
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
    const acceptUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, account_id, role, invited_by, invite_token,
        email_verified, password, plan_type, plan_period)
       VALUES ($1, $2, $3, $4, $5, 'member', $6, $7, false, '', 'free', 'monthly')`,
      [randomUUID(), email.toLowerCase(), firstName, lastName || "", req.session.accountId, req.session.userId, inviteToken]
    );

    const { sendTeamInviteEmail } = await import("./email");
    await sendTeamInviteEmail(
      email.toLowerCase(),
      `${owner?.first_name || ""} ${owner?.last_name || ""}`.trim() || "Your team",
      companyName,
      acceptUrl
    );

    res.json({ ok: true });
  });

  // Resend invite email
  app.post("/api/team/:userId/resend-invite", requireAuth, async (req, res) => {
    if (req.session.userRole === "member") return res.status(403).json({ message: "Forbidden" });
    const { userId } = req.params;
    const { rows } = await pool.query(
      `SELECT email, first_name, invite_token FROM users WHERE id = $1 AND account_id = $2 AND email_verified = false`,
      [userId, req.session.accountId]
    );
    if (!rows.length) return res.status(404).json({ message: "Pending invite not found" });
    const member = rows[0];
    const { rows: ownerRows } = await pool.query(`SELECT first_name, last_name FROM users WHERE id = $1`, [req.session.userId]);
    const owner = ownerRows[0];
    const settings = await storage.getSettings(req.session.accountId!);
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
    const acceptUrl = `${appUrl}/accept-invite?token=${member.invite_token}`;
    const { sendTeamInviteEmail } = await import("./email");
    await sendTeamInviteEmail(
      member.email,
      `${owner?.first_name || ""} ${owner?.last_name || ""}`.trim() || "Your team",
      settings?.businessName || "your company",
      acceptUrl
    );
    res.json({ ok: true });
  });

  // Revoke a team member
  app.delete("/api/team/:userId", requireAuth, async (req, res) => {
    if (req.session.userRole === "member") {
      return res.status(403).json({ message: "Only the account owner can remove team members." });
    }
    const { userId } = req.params;
    // Safety: only delete members in same account
    await pool.query(
      `DELETE FROM users WHERE id = $1 AND account_id = $2 AND role = 'member'`,
      [userId, req.session.accountId]
    );
    res.json({ ok: true });
  });

  // Accept invite — validate token
  app.get("/api/auth/accept-invite", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Missing token" });
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name FROM users WHERE invite_token = $1`, [token]
    );
    if (!rows[0]) return res.status(400).json({ message: "Invalid or expired invitation link." });
    res.json({ email: rows[0].email, firstName: rows[0].first_name });
  });

  // Accept invite — set password
  app.post("/api/auth/accept-invite", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Missing token or password" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const { rows } = await pool.query(
      `SELECT id, account_id FROM users WHERE invite_token = $1`, [token]
    );
    if (!rows[0]) return res.status(400).json({ message: "Invalid or expired invitation link." });

    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
      `UPDATE users SET password = $1, email_verified = true, invite_token = NULL WHERE id = $2`,
      [hashed, rows[0].id]
    );

    req.session.userId = rows[0].id;
    req.session.accountId = rows[0].account_id;
    (req.session as any).userRole = "member";
    await new Promise<void>(resolve => req.session.save(() => resolve()));
    res.json({ ok: true });
  });

  // Insight email open tracking pixel
  app.get("/api/insight/track-open", async (req, res) => {
    const { id } = req.query;
    if (id) {
      await pool.query(
        `UPDATE insight_email_log SET opened_at = NOW() WHERE id = $1 AND opened_at IS NULL`,
        [id]
      ).catch(() => {});
    }
    // Return 1x1 transparent GIF
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store");
    res.end(gif);
  });

  // Insight email opt-out
  app.get("/api/insight/opt-out", async (req, res) => {
    const { uid } = req.query;
    if (uid) {
      await pool.query(
        `UPDATE users SET insight_email_frequency = 'never', insight_emails_opt_out = true WHERE id = $1`,
        [uid]
      ).catch(() => {});
    }
    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed — ReviewOptic</title>
      <style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 24px;text-align:center;color:#333;}
      h2{font-size:22px;font-weight:700;margin-bottom:8px;}p{color:#666;font-size:14px;line-height:1.6;}
      a{color:#2563eb;text-decoration:underline;}</style></head>
      <body><h2>You've been unsubscribed</h2>
      <p>You won't receive any more review report emails from ReviewOptic.</p>
      <p>Changed your mind? <a href="/settings?tab=notifications">Update your preferences</a> in your account settings.</p>
      </body></html>
    `);
  });

  // Notification preferences (get)
  app.get("/api/user/notification-prefs", requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT insight_email_frequency FROM users WHERE id = $1`,
      [req.session.userId]
    );
    res.json({ insightEmailFrequency: rows[0]?.insight_email_frequency || "weekly" });
  });

  // Notification preferences (update)
  app.patch("/api/user/notification-prefs", requireAuth, async (req, res) => {
    const { insightEmailFrequency } = req.body;
    const valid = ["weekly", "monthly", "never"];
    if (!valid.includes(insightEmailFrequency)) {
      return res.status(400).json({ message: "Invalid frequency" });
    }
    await pool.query(
      `UPDATE users SET insight_email_frequency = $1, insight_emails_opt_out = $2 WHERE id = $3`,
      [insightEmailFrequency, insightEmailFrequency === "never", req.session.userId]
    );
    res.json({ ok: true });
  });

  // Admin: insight email stats
  app.get("/api/admin/insight-stats", requireAuth, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const { rows: adminCheck } = await pool.query(`SELECT is_admin FROM users WHERE id = $1`, [req.session.userId]);
    if (!adminCheck[0]?.is_admin) return res.status(403).json({ message: "Forbidden" });

    const [totalRes, openedRes, optOutRes, recentRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM insight_email_log`),
      pool.query(`SELECT COUNT(*) FROM insight_email_log WHERE opened_at IS NOT NULL`),
      pool.query(`SELECT COUNT(*) FROM users WHERE insight_emails_opt_out = true`),
      pool.query(`SELECT l.email, l.sent_at, l.opened_at, s.business_name
        FROM insight_email_log l
        LEFT JOIN settings s ON s.account_id = l.account_id
        ORDER BY l.sent_at DESC LIMIT 20`),
    ]);

    const total = parseInt(totalRes.rows[0].count);
    const opened = parseInt(openedRes.rows[0].count);
    res.json({
      totalSent: total,
      totalOpened: opened,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      optOuts: parseInt(optOutRes.rows[0].count),
      recentEmails: recentRes.rows,
    });
  });

  return httpServer;
}
