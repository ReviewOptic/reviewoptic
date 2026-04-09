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
import QRCode from "qrcode";
import { sendVerificationEmail, sendPreScreenEmail, sendRatingNotificationEmail, REVIEWOPTIC_FROM } from "./email";
import webpush from "web-push";
import { generateReviewCard } from "./reviewCard";
import { uploadBufferToCloudinary } from "./cloudinary";
import { sendReviewSMS, sendWhatsAppMessage, sendPlainSMS } from "./sms";
import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from "./cloudinary";
import { cloneVoice, deleteVoice, generateNameAudio, stitchNameToFront } from "./elevenlabs";
import type { Review, Customer, Settings } from "@shared/schema";
import { UAParser } from "ua-parser-js";

// ─── WEB PUSH ────────────────────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:hello@reviewoptic.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToAccount(accountId: string, payload: { title: string; body: string; link: string; tag?: string }) {
  try {
    const { rows } = await pool.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE account_id = $1`,
      [accountId]
    );
    const dead: string[] = [];
    await Promise.all(rows.map(async (row: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) dead.push(row.endpoint);
      }
    }));
    if (dead.length > 0) {
      await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = ANY($1)`, [dead]);
    }
  } catch { /* ignore */ }
}

async function logUserSession(req: Request, userId: string, accountId: string) {
  try {
    const ua = new UAParser(req.headers["user-agent"] || "");
    const device = ua.getDevice().type || "desktop";
    const browser = ua.getBrowser().name || "Unknown";
    const os = ua.getOS().name || "Unknown";
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, account_id, device_type, browser, os) VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), userId, accountId, device, browser, os]
    );
  } catch (_) {}
}

async function sendResetEmail(to: string, resetUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[password reset] No RESEND_API_KEY set. Reset link for ${to}: ${resetUrl}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject: "Reset your ReviewOptic password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:28px;"><a href="https://reviewoptic.com" style="text-decoration:none;"><img src="${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com")}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></a></div>
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
    console.log("[requireAuth] 401", req.method, req.path, {
      sessionID: req.sessionID,
      hasCookie: !!req.headers.cookie,
      userId: req.session.userId,
      accountId: req.session.accountId,
    });
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
        ? pool.query(`SELECT plan_type, payment_failed, is_suspended FROM users WHERE account_id = $1 AND role = 'owner' LIMIT 1`, [req.session.accountId])
        : pool.query(`SELECT plan_type, payment_failed, is_suspended FROM users WHERE id = $1`, [user.id]);
      planQuery.then(({ rows }) => {
        const planType = rows[0]?.plan_type || "free";
        const paymentFailed = rows[0]?.payment_failed || false;
        const isSuspended = rows[0]?.is_suspended || false;
        if (isSuspended) return res.status(403).json({ message: "Your account has been suspended. Please contact hello@reviewoptic.com.", code: "suspended" });
        if (planType === "free") return res.status(402).json({ message: "Subscription required" });
        const isSendingRequest = req.path === "/api/review-requests" && req.method === "POST";
        const isAddingCustomer = req.path === "/api/customers" && req.method === "POST";
        // Cancelled plan — block only sending new review requests and adding customers
        if (planType === "cancelled") {
          if (isSendingRequest || isAddingCustomer) {
            return res.status(402).json({ message: "Your subscription has ended. Please reactivate to continue.", code: "subscription_ended" });
          }
        }
        // Payment failed — same restrictions with different message
        if (paymentFailed) {
          if (isSendingRequest || isAddingCustomer) {
            return res.status(402).json({ message: "Your last payment failed. Please update your payment details to continue.", code: "payment_failed" });
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
  const stars = (review as any).stars ?? (review as any).rating ?? 5;
  const caption = settings.socialPostMessage
    .replace("{stars}", String(stars))
    .replace("{customer_name}", customer.name);

  // Generate review card image (for Facebook photo post + Instagram)
  let imageUrl = "";
  if (isCloudinaryConfigured()) {
    try {
      const cardBuffer = await generateReviewCard(stars, customer.name, settings.businessName);
      imageUrl = await uploadBufferToCloudinary(cardBuffer, "review-cards");
    } catch (err) {
      console.error("Review card generation error:", err);
    }
  }

  if (settings.facebookPageAccessToken && settings.facebookPageId) {
    try {
      if (imageUrl) {
        // Post as photo (looks better, also required for Instagram cross-post)
        await fetch(`https://graph.facebook.com/v18.0/${settings.facebookPageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: imageUrl, caption, access_token: settings.facebookPageAccessToken }),
        });
      } else {
        // Fallback to text post if no image
        await fetch(`https://graph.facebook.com/v18.0/${settings.facebookPageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: caption, access_token: settings.facebookPageAccessToken }),
        });
      }
    } catch (err) {
      console.error("Facebook post error:", err);
    }
  }

  // Instagram — requires image
  if (imageUrl && settings.facebookPageAccessToken && settings.instagramBusinessAccountId) {
    try {
      // Step 1: create media container
      const containerRes = await fetch(`https://graph.facebook.com/v18.0/${settings.instagramBusinessAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: settings.facebookPageAccessToken,
        }),
      });
      const container = await containerRes.json() as any;
      if (container.id) {
        // Step 2: publish container
        await fetch(`https://graph.facebook.com/v18.0/${settings.instagramBusinessAccountId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: container.id, access_token: settings.facebookPageAccessToken }),
        });
      }
    } catch (err) {
      console.error("Instagram post error:", err);
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
              shareCommentary: { text: caption },
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
  storage: multer.memoryStorage(),
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

const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.webm`),
  }),
});

// Temporary in-memory store for preview files (keyed by previewId)
const previewFiles = new Map<string, { path: string; expires: number }>();
// Clean up expired previews every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of Array.from(previewFiles.entries())) {
    if (now > entry.expires) {
      fs.unlink(entry.path, () => {});
      previewFiles.delete(id);
    }
  }
}, 5 * 60 * 1000);


export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Auth routes (no requireAuth) ──────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, firstName, lastName, companyName, referredByAccountId, termsAccepted } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    if (!firstName || !lastName) return res.status(400).json({ message: "First and last name are required" });
    if (!companyName) return res.status(400).json({ message: "Company name is required" });
    if (!termsAccepted) return res.status(400).json({ message: "You must accept the Terms and Conditions to create an account." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: "Password must contain at least one number" });
    if (!/[^a-zA-Z0-9]/.test(password)) return res.status(400).json({ message: "Password must contain at least one symbol" });

    const existing = await storage.getUserByEmail(email);
    if (existing) {
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
    if (referredByAccountId) {
      await pool.query(`UPDATE users SET referred_by_account_id = $1 WHERE id = $2`, [referredByAccountId, user.id]).catch(() => {});
    }
    await pool.query(`UPDATE users SET terms_accepted_at = NOW() WHERE id = $1`, [user.id]).catch(() => {});

    // Create default settings for the new account
    await storage.upsertSettings(account.id, {
      businessName: companyName,
      businessEmail: email.toLowerCase(),
    });

    // Create default templates
    const posBody = `Thank you for your rating. Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{business_name}}`;
    const negBody = `We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}`;
    const defaultTemplates = [
      { id: randomUUID(), accountId: account.id, name: "After 4–5★ Rating", templateType: "response_positive", channel: "email", isDefault: true, preferredPlatform: "", subject: "Thank you for your rating", body: posBody },
      { id: randomUUID(), accountId: account.id, name: "After 4–5★ Rating", templateType: "response_positive", channel: "sms", isDefault: true, preferredPlatform: "", subject: "", body: posBody },
      { id: randomUUID(), accountId: account.id, name: "After 4–5★ Rating", templateType: "response_positive", channel: "whatsapp", isDefault: true, preferredPlatform: "", subject: "", body: posBody },
      { id: randomUUID(), accountId: account.id, name: "After 1–3★ Rating", templateType: "response_negative", channel: "email", isDefault: true, preferredPlatform: "", subject: "We'd love to make this right", body: negBody },
      { id: randomUUID(), accountId: account.id, name: "After 1–3★ Rating", templateType: "response_negative", channel: "sms", isDefault: true, preferredPlatform: "", subject: "", body: negBody },
      { id: randomUUID(), accountId: account.id, name: "After 1–3★ Rating", templateType: "response_negative", channel: "whatsapp", isDefault: true, preferredPlatform: "", subject: "", body: negBody },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 1", templateType: "follow_up_1", channel: "email", isDefault: true, preferredPlatform: "", subject: "Just checking in", body: `Just a quick follow-up from {{business_name}} — we'd love to hear how we did!\n\nTap the link below to leave your rating.\n\nThanks,\n{{owner_name}}\n{{business_name}}` },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 2", templateType: "follow_up_2", channel: "email", isDefault: true, preferredPlatform: "", subject: "A polite reminder", body: `We know you're busy, but your feedback really means a lot to {{business_name}}!\n\nTap the link below whenever you're ready.\n\nThanks,\n{{owner_name}}\n{{business_name}}` },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 3", templateType: "follow_up_3", channel: "email", isDefault: true, preferredPlatform: "", subject: "We'd still love to hear from you", body: `This is our last message, we promise! If you ever have a moment, we'd still love to hear from you.\n\nTap the link below.\n\nThanks,\n{{owner_name}}\n{{business_name}}` },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 1", templateType: "follow_up_1", channel: "sms", isDefault: true, preferredPlatform: "", subject: "", body: "Just a quick follow-up from {{business_name}} — we'd love to hear how we did!" },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 2", templateType: "follow_up_2", channel: "sms", isDefault: true, preferredPlatform: "", subject: "", body: "Your feedback means a lot to us — tap below when you're ready!\n{{business_name}}" },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 3", templateType: "follow_up_3", channel: "sms", isDefault: true, preferredPlatform: "", subject: "", body: "Last one from us! If you get a moment, we'd love your feedback.\n{{business_name}}" },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 1", templateType: "follow_up_1", channel: "whatsapp", isDefault: true, preferredPlatform: "", subject: "", body: "😊 Just a quick follow-up from {{business_name}} — we'd love to hear how we did! Tap the link below when you get a moment 👇" },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 2", templateType: "follow_up_2", channel: "whatsapp", isDefault: true, preferredPlatform: "", subject: "", body: "💛 Your feedback really means a lot to us! Whenever you're ready, just tap the link below — we appreciate it 🙏\n\n{{business_name}}" },
      { id: randomUUID(), accountId: account.id, name: "Follow-up 3", templateType: "follow_up_3", channel: "whatsapp", isDefault: true, preferredPlatform: "", subject: "", body: "🙏 Last message from us, we promise! If you ever get a moment, we'd genuinely love to hear from you.\n\n{{business_name}}" },
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
    await new Promise<void>((resolve, reject) => req.session.save((err) => {
      if (err) { console.error("[register] Session save failed:", err); reject(err); }
      else resolve();
    }));
    console.log("[register] Session saved, userId:", req.session.userId, "sessionID:", req.sessionID);

    // Verification email is sent after payment via billing/confirm — not at registration

    // Return full user object so the client can set user state directly (no second round-trip)
    res.json({
      id: user.id,
      email: user.email,
      accountId: user.accountId,
      isAdmin: false,
      isImpersonating: false,
      planType: "free",
      planPeriod: "monthly",
      requiresPayment: true,
      emailVerified: false,
      role: "owner",
      firstName,
      lastName,
      companyName,
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.emailVerified) {
      // Allow unverified users to log in — they need to be able to reach the payment page
      // Email verification is enforced after payment via the billing/confirm flow
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
        // Allow free plan users to log in — they'll be redirected to /pricing by requiresPayment
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
    await new Promise<void>((resolve, reject) => req.session.save((err) => {
      if (err) { console.error("[login] Session save failed:", err); reject(err); }
      else resolve();
    }));
    logUserSession(req, user.id, user.accountId);
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
    try {
      // Retry once on DB error — handles stale connections after Neon serverless sleep
      let user;
      try {
        user = await storage.verifyUserEmail(token);
      } catch (firstErr: any) {
        console.warn("[verify-email] First attempt failed, retrying:", firstErr?.message);
        await new Promise(r => setTimeout(r, 800));
        user = await storage.verifyUserEmail(token);
      }
      if (!user) return res.status(400).json({ message: "Invalid or already used verification link." });
      req.session.userId = user.id;
      req.session.accountId = user.accountId;
      await new Promise<void>((resolve) => req.session.save((err) => {
        if (err) console.error("[verify-email] Session save failed:", err);
        resolve();
      }));
      console.log("[verify-email] Success for user:", user.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[verify-email] Error after retry:", err?.message, err);
      res.status(500).json({ message: "Verification failed — please try again or contact support." });
    }
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

  // Schedule account for permanent deletion (30 days from now)
  app.delete("/api/account", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const accountId = req.session.accountId!;

      // Only account owners can delete
      const { rows } = await pool.query(`SELECT role, password, email FROM users WHERE id = $1`, [userId]);
      if (rows[0]?.role !== "owner") {
        return res.status(403).json({ message: "Only the account owner can delete the account." });
      }

      // Admin account is permanently protected
      if (rows[0]?.email === "hello@reviewoptic.com") {
        return res.status(403).json({ message: "This account cannot be deleted." });
      }

      // Verify password
      const { password } = req.body;
      if (!password) return res.status(400).json({ message: "Password is required to confirm deletion." });
      const passwordMatch = await bcrypt.compare(password, rows[0].password);
      if (!passwordMatch) return res.status(401).json({ message: "Incorrect password — please try again." });

      // Cancel Stripe subscription immediately if active
      const { rows: subRows } = await pool.query(
        `SELECT stripe_subscription_id FROM users WHERE id = $1`,
        [userId]
      );
      const subId = subRows[0]?.stripe_subscription_id;
      if (subId && process.env.STRIPE_SECRET_KEY) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(subId).catch(() => {});
      }

      // Mark all users on this account as scheduled for deletion in 30 days
      const purgeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      await pool.query(
        `UPDATE users SET scheduled_for_deletion_at = NOW() + INTERVAL '30 days', plan_type = 'cancelled' WHERE account_id = $1`,
        [accountId]
      );
      // Move them to "former subscribers (deleted)" in the admin's customer list
      if (process.env.ADMIN_EMAIL) {
        const adminUser = await storage.getUserByEmail(process.env.ADMIN_EMAIL);
        if (adminUser) {
          const { rows: ownerRows } = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
          if (ownerRows[0]) {
            await pool.query(
              `UPDATE customers SET status = 'subscriber_deleted', do_not_contact = true WHERE account_id = $1 AND email = $2`,
              [adminUser.accountId, ownerRows[0].email]
            ).catch(() => {});
          }
        }
      }

      // Send deletion confirmation email with reactivation link
      const { rows: emailRows } = await pool.query(`SELECT email, first_name FROM users WHERE id = $1`, [userId]);
      if (emailRows[0]) {
        const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
        const { sendAccountDeletionEmail } = await import("./email");
        sendAccountDeletionEmail(emailRows[0].email, emailRows[0].first_name || "", purgeDate, `${appUrl}/pricing`).catch(err =>
          console.error("[delete account] Failed to send deletion email:", err.message)
        );
      }

      // Log them out
      req.session.destroy(() => {});
      res.json({ success: true });
    } catch (err: any) {
      console.error("[delete account]", err.message);
      res.status(500).json({ message: "Failed to schedule account deletion." });
    }
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
        `SELECT plan_type, plan_period, role, first_name, last_name, company_name, payment_failed, is_suspended FROM users WHERE id = $1`,
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
      paymentFailed: billing.payment_failed || false,
      isSuspended: billing.is_suspended || false,
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

  app.get("/api/admin/fix-templates", requireAdmin, async (req, res) => {
    await pool.query(`UPDATE templates SET body = 'Just checking in! We''d love to hear from you — tap below:' WHERE template_type = 'follow_up_1' AND channel = 'sms'`);
    await pool.query(`UPDATE templates SET body = 'We''d still love your feedback! Tap below when you get a moment:' WHERE template_type = 'follow_up_2' AND channel = 'sms'`);
    await pool.query(`UPDATE templates SET body = 'Last message from us! We''d still love your feedback — tap below:' WHERE template_type = 'follow_up_3' AND channel = 'sms'`);
    await pool.query(`UPDATE templates SET body = '😊 Just a quick follow-up from {{business_name}} — we''d love to hear how we did! Tap the link below to leave your rating:' WHERE template_type = 'follow_up_1' AND channel = 'whatsapp'`);
    await pool.query(`UPDATE templates SET body = '💛 We know you''re busy, but your feedback really means a lot to {{business_name}}! Tap the link below whenever you''re ready:' WHERE template_type = 'follow_up_2' AND channel = 'whatsapp'`);
    await pool.query(`UPDATE templates SET body = '🙏 This is our last message, we promise! If you ever have a moment, we''d still love to hear from you — tap the link below:' WHERE template_type = 'follow_up_3' AND channel = 'whatsapp'`);
    await pool.query(`UPDATE templates SET body = 'Just a quick follow-up from {{business_name}} — we''d love to hear how we did!\n\nTap the link below to leave your rating.\n\nThanks,\n{{business_name}}' WHERE template_type IN ('follow_up', 'follow_up_1') AND channel = 'email' AND (body ILIKE '%Hi {{first_name}}%' OR body LIKE '%The {{business_name}} team%' OR body LIKE '%The {{business_name}} Team%')`);
    await pool.query(`UPDATE templates SET body = 'We know you''re busy, but your feedback really means a lot to {{business_name}}!\n\nTap the link below whenever you''re ready.\n\nThanks,\n{{business_name}}' WHERE template_type = 'follow_up_2' AND channel = 'email' AND (body ILIKE '%Hi {{first_name}}%' OR body LIKE '%The {{business_name}} team%')`);
    await pool.query(`UPDATE templates SET body = 'This is our last message, we promise! If you ever have a moment, we''d still love to hear from you.\n\nTap the link below.\n\nThanks,\n{{business_name}}' WHERE template_type = 'follow_up_3' AND channel = 'email' AND (body ILIKE '%Hi {{first_name}}%' OR body LIKE '%The {{business_name}} team%')`);
    await pool.query(`UPDATE templates SET body = 'Thank you so much for your rating! If you have a moment, we''d really appreciate it if you could share your experience with others on one of our review pages below.\n\nThanks,\n{{business_name}}' WHERE template_type = 'response_positive' AND (body ILIKE '%Hi {{first_name}}%' OR body LIKE '%The {{business_name}} team%')`);
    await pool.query(`UPDATE templates SET body = 'Thank you for your feedback — we''re sorry to hear your experience didn''t meet expectations. We''d love the chance to make it right.\n\nPlease reply to this message and we''ll be in touch shortly.\n\nThanks,\n{{business_name}}' WHERE template_type = 'response_negative' AND (body ILIKE '%Hi {{first_name}}%' OR body LIKE '%The {{business_name}} team%')`);
    res.json({ ok: true, message: "Templates fixed" });
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const [allUsers, stats] = await Promise.all([storage.getAllUsers(), storage.getAdminUserStats()]);
    const { rows: planRows } = await pool.query(`SELECT id, plan_type, COALESCE(email_unsubscribed, false) as email_unsubscribed, COALESCE(is_suspended, false) as is_suspended FROM users`);
    const planMap = Object.fromEntries(planRows.map((r: any) => [r.id, r.plan_type]));
    const unsubMap = Object.fromEntries(planRows.map((r: any) => [r.id, r.email_unsubscribed]));
    const suspendMap = Object.fromEntries(planRows.map((r: any) => [r.id, r.is_suspended]));
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
      planType: planMap[u.id] || "free",
      emailUnsubscribed: unsubMap[u.id] ?? false,
      isSuspended: suspendMap[u.id] ?? false,
      customerCount: statsMap[u.id]?.customerCount ?? 0,
      reviewRequestCount: statsMap[u.id]?.reviewRequestCount ?? 0,
      lastActive: statsMap[u.id]?.lastActive ?? null,
    })));
  });

  // Users who registered but haven't paid yet (free plan, not admin)
  app.get("/api/admin/pending-users", requireAdmin, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, last_name, created_at, email_verified
       FROM users
       WHERE plan_type = 'free' AND is_admin = false
       ORDER BY created_at DESC`
    );
    res.json(rows.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
      emailVerified: u.email_verified,
      createdAt: u.created_at,
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
    // Also remove them from the admin's own customer list (added at registration for review request purposes)
    if (process.env.ADMIN_EMAIL) {
      const adminUser = await storage.getUserByEmail(process.env.ADMIN_EMAIL);
      if (adminUser) {
        await pool.query(`DELETE FROM customers WHERE account_id = $1 AND email = $2`, [adminUser.accountId, target.email]).catch(() => {});
      }
    }
    await storage.deleteUserAccount(String(req.params.userId));
    res.json({ success: true });
  });

  app.post("/api/admin/toggle-suspend/:userId", requireAdmin, async (req, res) => {
    const target = await storage.getUser(String(req.params.userId));
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.isAdmin) return res.status(400).json({ message: "Cannot suspend an admin account" });
    const { rows } = await pool.query(`UPDATE users SET is_suspended = NOT is_suspended WHERE id = $1 RETURNING is_suspended`, [target.id]);
    res.json({ isSuspended: rows[0]?.is_suspended });
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

  // Cancelled subscriptions — full details for reactivation outreach
  app.get("/api/admin/cancelled-accounts", requireAdmin, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.email, u.first_name, u.last_name, u.company_name, u.plan_type, u.plan_period, u.cancelled_at,
              (SELECT COUNT(*) FROM customers c WHERE c.account_id = u.account_id)::int AS customer_count,
              (SELECT COUNT(*) FROM review_requests rr WHERE rr.account_id = u.account_id)::int AS request_count
       FROM users u
       WHERE u.plan_type = 'cancelled' AND u.role = 'owner'
       ORDER BY u.cancelled_at DESC NULLS LAST`
    );
    res.json(rows);
  });

  // Deleted accounts log — anonymised, for audit trail only
  app.get("/api/admin/deleted-accounts", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT scheduled_for_deletion_at AS deletion_scheduled_at, cancelled_at
         FROM users
         WHERE scheduled_for_deletion_at IS NOT NULL AND role = 'owner'
         ORDER BY scheduled_for_deletion_at DESC`
      );
      res.json(rows);
    } catch {
      res.json([]); // Column not yet in DB — return empty until migration runs
    }
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
        planBreakdownR, reactivatedR, geoR, devicesR, browsersR,
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
        pool.query(`SELECT u.email, u.cancelled_at, u.reactivated_at, ROUND(EXTRACT(EPOCH FROM (u.reactivated_at - u.cancelled_at))/86400) as days_away FROM users u WHERE u.cancelled_at IS NOT NULL AND u.reactivated_at IS NOT NULL AND NOT u.is_admin ORDER BY u.reactivated_at DESC`),
        pool.query(`SELECT s.country, COUNT(*) as count FROM settings s JOIN users u ON u.account_id = s.account_id WHERE s.country != '' AND NOT u.is_admin AND u.role = 'owner' GROUP BY s.country ORDER BY count DESC`),
        pool.query(`SELECT device_type, COUNT(*) as count FROM user_sessions GROUP BY device_type ORDER BY count DESC`),
        pool.query(`SELECT browser, COUNT(*) as count FROM user_sessions GROUP BY browser ORDER BY count DESC LIMIT 8`),
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
          reactivated: reactivatedR.rows,
          avgDaysToReactivate: reactivatedR.rows.length > 0
            ? Math.round(reactivatedR.rows.reduce((sum: number, r: any) => sum + parseFloat(r.days_away || 0), 0) / reactivatedR.rows.length)
            : null,
        },
        funnelMetrics: { signups: funnelSignups, firstAction: funnelFirstAction, returnVisit: funnelReturnVisit, powerUsers: funnelPowerUsers },
        featureUsage: featureUsageR.rows,
        topUsers: topUsersR.rows,
        timeToFirstAction: parseFloat(timeToFirstActionR.rows[0]?.avg_hours || 0),
        alerts,
        geography: geoR.rows.map((r: any) => ({ country: r.country, count: parseInt(r.count) })),
        devices: devicesR.rows.map((r: any) => ({ type: r.device_type || "desktop", count: parseInt(r.count) })),
        browsers: browsersR.rows.map((r: any) => ({ browser: r.browser, count: parseInt(r.count) })),
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

  // Short link redirect for SMS — /r/:id → /review?rid=:id (saves ~10 chars per SMS)
  app.get("/r/:id", (req, res) => {
    res.redirect(302, `/review?rid=${req.params.id}`);
  });

  // Email open tracking pixel — 1×1 transparent GIF, sets opened_at once
  app.get("/api/track/:requestId/open", async (req, res) => {
    const { requestId } = req.params;
    await pool.query(
      `UPDATE review_requests SET opened_at = NOW() WHERE id = $1 AND opened_at IS NULL`,
      [requestId]
    ).catch(() => {});
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" });
    res.end(gif);
  });

  // Track link click (must remain public — customers click this)
  // Email link click — just redirects to the landing page, no status change.
  // Status is only updated when the customer clicks an actual review platform button.
  app.get("/api/track/:requestId/click", async (req, res) => {
    res.redirect("/review-landing?rid=" + req.params.requestId);
  });

  // Platform button click — records which platform and marks as clicked
  app.post("/api/track/:requestId/platform-click", async (req, res) => {
    const { platform } = req.body;
    if (!platform) return res.status(400).json({ message: "platform required" });
    const rr = await storage.getReviewRequest(req.params.requestId);
    if (!rr) return res.status(404).json({ message: "Not found" });

    await pool.query(
      `INSERT INTO review_platform_clicks (id, request_id, account_id, platform) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), rr.id, rr.accountId, platform]
    );

    // Only update status/activity once (first platform click)
    if (rr.status !== "clicked") {
      await storage.updateReviewRequest(rr.id, { status: "clicked", clickedAt: new Date() });
      const customer = await storage.getCustomer(rr.customerId, rr.accountId);
      if (customer) {
        await storage.updateCustomer(customer.id, { status: "clicked" }, rr.accountId);
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
        await storage.createActivity({
          id: randomUUID(),
          accountId: rr.accountId,
          type: "link_clicked",
          customerId: customer.id,
          customerName: customer.name,
          message: `${customer.name} clicked the ${platformName} review link`,
          metadata: JSON.stringify({ platform }),
        });
      }
    }
    res.json({ ok: true });
  });

  // Reviews submit (public — customers submit this)
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
    const layout = settings?.widgetLayout || "grid";
    const rows = await pool.query(
      `SELECT rr.rating, rr.created_at, c.name
       FROM review_requests rr
       JOIN customers c ON c.id = rr.customer_id
       WHERE rr.account_id = $1 AND rr.rating >= $2
       ORDER BY rr.created_at DESC
       LIMIT $3`,
      [req.params.businessId, minStars, count]
    );
    const result = rows.rows.map((r: any) => {
      const parts = (r.name || "").trim().split(" ");
      const displayName = parts.length >= 2
        ? parts[0] + " " + parts[parts.length - 1][0] + "."
        : parts[0] || "Anonymous";
      return { displayName, rating: r.rating, createdAt: r.created_at };
    });
    res.json({ reviews: result, businessName: settings?.businessName || "My Business", layout });
  });

  // ── QR Code — generate SVG for /scan/:accountId page ──
  app.get("/api/public/qr/:accountId", async (req, res) => {
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
    const url = `${appUrl}/scan/${req.params.accountId}`;
    try {
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 256 });
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(svg);
    } catch {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // ── Scan page info — public, returns business name + platforms ──
  app.get("/api/public/scan-info/:accountId", async (req, res) => {
    const settings = await storage.getSettings(req.params.accountId);
    if (!settings) return res.status(404).json({ message: "Not found" });
    const platforms = [
      { key: "google", name: "Google", url: settings.googleReviewLink },
      { key: "facebook", name: "Facebook", url: settings.facebookReviewLink },
      { key: "trustpilot", name: "Trustpilot", url: settings.trustpilotLink },
      { key: "tripadvisor", name: "TripAdvisor", url: settings.tripadvisorLink },
      { key: "checkatrade", name: "Checkatrade", url: settings.checkatradeLink },
      { key: "mybuilder", name: "MyBuilder", url: settings.mybuilderLink },
    ].filter(p => p.url);
    res.json({ businessName: settings.businessName, platforms });
  });

  // ── Scan page feedback — public, saves low-rating feedback ──
  app.post("/api/public/scan-feedback", async (req, res) => {
    const { accountId, star, message } = req.body;
    if (!accountId || !star) return res.status(400).json({ message: "Missing fields" });
    if (star <= 3 && message?.trim()) {
      await pool.query(
        `INSERT INTO private_feedback (id, account_id, message, rating, source, created_at) VALUES ($1, $2, $3, $4, 'qr_scan', NOW())`,
        [randomUUID(), accountId, message.trim(), star]
      ).catch(() => {});
    }
    const settings = await storage.getSettings(accountId);
    const platforms = [
      { key: "google", name: "Google", url: settings?.googleReviewLink },
      { key: "facebook", name: "Facebook", url: settings?.facebookReviewLink },
      { key: "trustpilot", name: "Trustpilot", url: settings?.trustpilotLink },
      { key: "tripadvisor", name: "TripAdvisor", url: settings?.tripadvisorLink },
      { key: "checkatrade", name: "Checkatrade", url: settings?.checkatradeLink },
      { key: "mybuilder", name: "MyBuilder", url: settings?.mybuilderLink },
    ].filter(p => p.url);
    res.json({ highRating: star >= 4, platforms });
  });

  // ── Zapier webhook — get/generate token ──
  app.get("/api/settings/webhook-token", requireAuth, async (req, res) => {
    const { rows } = await pool.query(`SELECT webhook_token FROM users WHERE id = $1`, [req.session.userId]);
    let token = rows[0]?.webhook_token;
    if (!token) {
      token = randomUUID();
      await pool.query(`UPDATE users SET webhook_token = $1 WHERE id = $2`, [token, req.session.userId]);
    }
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
    res.json({ token, webhookUrl: `${appUrl}/api/public/webhook/${token}` });
  });

  app.post("/api/settings/webhook-token/regenerate", requireAuth, async (req, res) => {
    const token = randomUUID();
    await pool.query(`UPDATE users SET webhook_token = $1 WHERE id = $2`, [token, req.session.userId]);
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
    res.json({ token, webhookUrl: `${appUrl}/api/public/webhook/${token}` });
  });

  // ── Zapier webhook — receive customer data ──
  app.post("/api/public/webhook/:token", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.account_id FROM users u WHERE u.webhook_token = $1 AND u.role = 'owner'`,
      [req.params.token]
    );
    if (rows.length === 0) return res.status(401).json({ message: "Invalid webhook token" });
    const { account_id: accountId } = rows[0];

    const { firstName, lastName, email, phone, channel, scheduledSendDate, serviceType, notes } = req.body;
    if (!firstName) return res.status(400).json({ message: "firstName is required" });
    if (!email && !phone) return res.status(400).json({ message: "email or phone is required" });

    const customer = await storage.createCustomer({
      id: randomUUID(),
      accountId,
      name: [firstName, lastName].filter(Boolean).join(" "),
      email: email || "",
      phone: phone || "",
      channel: channel || (email ? "email" : "sms"),
      serviceType: serviceType || "",
      notes: notes || "",
      status: scheduledSendDate ? "scheduled" : "pending_request",
    });

    if (scheduledSendDate) {
      const sendAt = new Date(scheduledSendDate);
      if (isNaN(sendAt.getTime())) return res.status(400).json({ message: "Invalid scheduledSendDate — use ISO 8601 format e.g. 2026-04-15T09:00:00" });

      const rr = await storage.createReviewRequest({
        id: randomUUID(),
        accountId,
        customerId: customer.id,
        channel: customer.channel,
        status: "scheduled",
        sentAt: new Date(),
        scheduledAt: sendAt,
      });
      await pool.query(
        `UPDATE review_requests SET scheduled_send_at = $1, schedule_status = 'pending' WHERE id = $2`,
        [sendAt, rr.id]
      );
      await storage.createActivity({
        id: randomUUID(), accountId, type: "request_sent",
        customerId: customer.id, customerName: customer.name,
        message: `Customer added via Zapier — review request scheduled for ${sendAt.toLocaleDateString("en-GB")}`,
        metadata: "{}",
      });
      return res.json({ ok: true, customerId: customer.id, reviewRequestId: rr.id, scheduledFor: sendAt.toISOString() });
    }

    res.json({ ok: true, customerId: customer.id, message: "Customer added. Send a review request manually from the dashboard." });
  });

  // ── Referral redirect — /referral/:slug → /register?ref={accountId} ──
  app.get("/referral/:slug", async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    // Match on account_id (first 8 chars) or business name slug
    const { rows } = await pool.query(`
      SELECT u.account_id, s.business_name FROM users u
      JOIN settings s ON s.account_id = u.account_id
      WHERE u.role = 'owner'
        AND (
          LOWER(REPLACE(REGEXP_REPLACE(s.business_name, '[^a-zA-Z0-9]+', '-', 'g'), '--', '-')) = $1
          OR LEFT(u.account_id, 8) = $1
        )
      LIMIT 1
    `, [slug]);
    if (rows.length === 0) return res.redirect("/register");
    res.redirect(`/register?ref=${rows[0].account_id}`);
  });

  // Public branding endpoint — returns the admin account's logo for the login page



  app.get("/api/features", (_req, res) => {
    res.json({
      smsEnabled: !!process.env.SMS_ENABLED,
      whatsappEnabled: !!process.env.WHATSAPP_ENABLED,
      socialEnabled: !!process.env.SOCIAL_ENABLED,
    });
  });

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

  app.get("/api/public/widget-stats/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS total, ROUND(AVG(rating)::numeric, 1)::float AS average
         FROM review_requests
         WHERE account_id = $1 AND rating IS NOT NULL`,
        [accountId]
      );
      const { total, average } = rows[0];
      if (!total) return res.json({ totalRatings: 0, averageRating: 0 });
      res.json({ totalRatings: total, averageRating: parseFloat(average) });
    } catch (err) {
      console.error("[widget-stats]", err);
      res.status(500).json({ message: "Error" });
    }
  });

  // ── Sentiment pre-screen public routes ───────────────────────────────────
  // Returns the minimal info needed to render the rating page (no auth required)
  app.get("/api/public/review-request/:id", async (req, res) => {
    try {
      const request = await storage.getReviewRequest(String(req.params.id));
      if (!request) return res.status(404).json({ message: "Not found" });
      const customer = await storage.getCustomer(request.customerId, request.accountId);
      const settings = await storage.getSettings(request.accountId);
      const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
      const logoUrl = settings?.logoUrl?.startsWith("http") ? settings.logoUrl : settings?.logoUrl ? `${baseUrl}${settings.logoUrl}` : "";
      const feedbackRow = await pool.query(
        `SELECT id FROM private_feedback WHERE review_request_id = $1 LIMIT 1`,
        [request.id]
      );

      // For high-rating return visits, include platform links and recording so the dialog can reopen
      let platforms: { key: string; name: string; url: string }[] = [];
      let recordingUrl = "";
      let recordingType = "";
      if (request.rating && request.rating >= 4) {
        const platformMap: Record<string, string> = {
          google: settings?.googleReviewLink || "",
          facebook: settings?.facebookReviewLink || "",
          trustpilot: settings?.trustpilotLink || "",
          tripadvisor: settings?.tripadvisorLink || "",
          checkatrade: settings?.checkatradeLink || "",
          mybuilder: settings?.mybuilderLink || "",
        };
        const platformNames: Record<string, string> = { google: "Google", facebook: "Facebook", trustpilot: "Trustpilot", tripadvisor: "TripAdvisor", checkatrade: "Checkatrade", mybuilder: "MyBuilder" };
        platforms = Object.entries(platformMap).filter(([, url]) => url).map(([key, url]) => ({ key, name: platformNames[key], url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}` }));
        const { rows: rrRows } = await pool.query(
          `SELECT recording_url, recording_type FROM review_requests WHERE id = $1`,
          [request.id]
        ).catch(() => ({ rows: [] as any[] }));
        if (rrRows.length > 0) {
          recordingUrl = rrRows[0].recording_url || "";
          recordingType = rrRows[0].recording_type || "";
        }
      }

      res.json({
        businessName: settings?.businessName || "Our Business",
        logoUrl,
        customerFirstName: customer?.name?.split(" ")[0] || "",
        alreadyRated: !!request.rating,
        existingRating: request.rating || null,
        feedbackSubmitted: feedbackRow.rows.length > 0,
        platforms,
        recordingUrl,
        recordingType,
      });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Customer submits their star rating — saves it, returns whether to show platforms or feedback form
  app.post("/api/public/review/:id/rate", async (req, res) => {
    try {
      const request = await storage.getReviewRequest(String(req.params.id));
      if (!request) return res.status(404).json({ message: "Not found" });
      if (request.rating) return res.status(409).json({ message: "Already rated", alreadyRated: true });
      const rating = parseInt(req.body.rating);
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Invalid rating" });

      await storage.updateReviewRequest(request.id, {
        rating,
        status: "clicked",
        clickedAt: new Date(),
      });

      const settings = await storage.getSettings(request.accountId);
      const platformMap: Record<string, string> = {
        google: settings?.googleReviewLink || "",
        facebook: settings?.facebookReviewLink || "",
        trustpilot: settings?.trustpilotLink || "",
        tripadvisor: settings?.tripadvisorLink || "",
        checkatrade: settings?.checkatradeLink || "",
        mybuilder: settings?.mybuilderLink || "",
      };
      const platformNames: Record<string, string> = { google: "Google", facebook: "Facebook", trustpilot: "Trustpilot", tripadvisor: "TripAdvisor", checkatrade: "Checkatrade", mybuilder: "MyBuilder" };

      // Fetch platform links for high rating display on landing page
      const platforms = rating >= 4
        ? Object.entries(platformMap).filter(([, url]) => url).map(([key, url]) => ({ key, name: platformNames[key], url: url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}` }))
        : [];

      // Auto-send the appropriate response template via the same channel
      const allTemplates = await storage.getTemplates(request.accountId);
      const customer = await storage.getCustomer(request.customerId, request.accountId);

      // Log activity for the rating
      if (customer) {
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        await storage.createActivity({
          id: randomUUID(),
          accountId: request.accountId,
          type: "review_received",
          customerId: customer.id,
          customerName: customer.name,
          message: `${customer.name} left a ${rating}-star rating ${stars}`,
          metadata: "{}",
        });

        // Fire in-app notification + push + email (non-blocking)
        const notifTitle = rating >= 4
          ? `${customer.name} left a ${rating}-star rating`
          : `${customer.name} left private feedback`;
        const notifBody = rating >= 4
          ? `${stars} — great news!`
          : `${rating} star${rating === 1 ? "" : "s"} — they've left feedback for you to review.`;
        const ownerEmail = await pool.query(
          `SELECT u.email, s.notify_ratings FROM users u JOIN settings s ON s.account_id = u.account_id WHERE u.account_id = $1 AND u.role = 'owner' LIMIT 1`,
          [request.accountId]
        ).then(r => r.rows[0]).catch(() => null);

        // In-app notification
        pool.query(
          `INSERT INTO notifications (id, account_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5, '/customers')`,
          [randomUUID(), request.accountId, "rating", notifTitle, notifBody]
        ).catch(() => {});

        // Push notification
        sendPushToAccount(request.accountId, { title: notifTitle, body: notifBody, link: "/customers", tag: "rating" }).catch(() => {});

        // Email notification (respects notify_ratings setting, defaults to true)
        if (ownerEmail?.email && ownerEmail.notify_ratings !== false) {
          const businessName = settings?.businessName || "";
          const appUrl = process.env.APP_URL || "https://reviewoptic.com";
          sendRatingNotificationEmail(ownerEmail.email, customer.name, rating, businessName, appUrl).catch(() => {});
        }
      }

      const templateType = rating >= 4 ? "response_positive" : "response_negative";
      // Use per-request template override if set, otherwise fall back to account default
      const { rows: rrMeta } = await pool.query(
        `SELECT positive_template_id, negative_template_id FROM review_requests WHERE id = $1`,
        [request.id]
      ).catch(() => ({ rows: [] as any[] }));
      const storedTemplateId = rating >= 4 ? rrMeta[0]?.positive_template_id : rrMeta[0]?.negative_template_id;
      const responseTemplate = (storedTemplateId ? allTemplates.find(t => t.id === storedTemplateId) : null)
        || allTemplates.find(t => t.templateType === templateType && t.channel === request.channel && t.isDefault)
        || allTemplates.find(t => t.templateType === templateType && t.channel === request.channel)
        || null;

      // Resolve template content to display on the landing page (no email/SMS sent)
      let templateBody = "";
      let templateOpening = "";
      if (responseTemplate && customer && settings) {
        const firstName = customer.name.split(" ")[0];
        const preferredPlatformUrl = responseTemplate.preferredPlatform
          ? platformMap[responseTemplate.preferredPlatform] || ""
          : "";
        const reviewLink = preferredPlatformUrl || Object.values(platformMap).find(u => u) || "";
        const serviceType = customer.serviceType || "";
        const ownerFirstName = (settings.ownerName || "").split(" ")[0];
        const resolve = (s: string) => {
          let out = s
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{customer_name\}\}/g, customer.name)
            .replace(/\{\{business_name\}\}/g, settings.businessName)
            .replace(/\{\{owner_name\}\}/g, ownerFirstName)
            .replace(/\{\{review_link\}\}/g, reviewLink);
          // If no service type, remove "and our {{service_type}}" (and variants) cleanly
          if (!serviceType) {
            out = out.replace(/\s*and our \{\{service_type\}\}/gi, "").replace(/\{\{service_type\}\}/g, "");
          } else {
            out = out.replace(/\{\{service_type\}\}/g, serviceType);
          }
          return out;
        };
        templateOpening = resolve(responseTemplate.subject || "");
        templateBody = resolve(responseTemplate.body);
      }

      // Auto-post to social for happy customers
      if (rating >= 4 && customer && settings) {
        postReviewToSocial({ stars: rating } as any, customer, settings).catch(err =>
          console.error("Social post failed:", err)
        );
      }

      // Fetch recording info to embed on the landing page for high ratings
      let recordingUrl = "";
      let recordingType = "";
      if (rating >= 4) {
        const { rows: rrRows } = await pool.query(
          `SELECT recording_url, recording_type FROM review_requests WHERE id = $1`,
          [request.id]
        ).catch(() => ({ rows: [] as any[] }));
        if (rrRows.length > 0) {
          recordingUrl = rrRows[0].recording_url || "";
          recordingType = rrRows[0].recording_type || "";
        }
      }

      res.json({ highRating: rating >= 4, platforms, recordingUrl, recordingType, templateBody, templateOpening });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Customer submits private feedback (1-3 stars) — saves it + notifies business owner
  app.post("/api/public/review/:id/feedback", async (req, res) => {
    try {
      const request = await storage.getReviewRequest(String(req.params.id));
      if (!request) return res.status(404).json({ message: "Not found" });

      const message = String(req.body.message || "").trim();
      if (!message) return res.status(400).json({ message: "Feedback message is required" });

      const feedback = await storage.createPrivateFeedback({
        id: randomUUID(),
        accountId: request.accountId,
        customerId: request.customerId,
        reviewRequestId: request.id,
        stars: request.rating || 1,
        message,
        responded: false,
        response: "",
        respondedAt: null,
      });

      // Log activity
      const customer = await storage.getCustomer(request.customerId, request.accountId);
      await storage.createActivity({
        id: randomUUID(),
        accountId: request.accountId,
        type: "private_feedback",
        customerId: request.customerId,
        customerName: customer?.name || "Unknown",
        message: `${customer?.name || "A customer"} left private feedback (${request.rating}★)`,
        metadata: "{}",
      });

      // Email notification to business owner
      if (process.env.RESEND_API_KEY) {
        const settings = await storage.getSettings(request.accountId);
        const ownerUser = await pool.query(`SELECT email FROM users WHERE account_id = $1 AND role = 'owner' LIMIT 1`, [request.accountId]);
        const toEmail = ownerUser.rows[0]?.email;
        if (toEmail) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
          await resend.emails.send({
            from: REVIEWOPTIC_FROM,
            to: toEmail,
            subject: `Private feedback received from ${customer?.name || "a customer"} (${request.rating}★)`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
                <div style="margin-bottom:28px;"><img src="${baseUrl}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></div>
                <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;">Private feedback received</h2>
                <p style="color:#555;margin:0 0 16px;line-height:1.6;">
                  <strong>${customer?.name || "A customer"}</strong> rated their experience <strong>${request.rating} star${request.rating === 1 ? "" : "s"}</strong> and left the following message:
                </p>
                <div style="background:#f5f5f5;border-left:4px solid #e5e7eb;padding:12px 16px;border-radius:4px;margin:0 0 24px;">
                  <p style="margin:0;font-style:italic;color:#333;">"${message}"</p>
                </div>
                <p style="color:#555;margin:0 0 24px;line-height:1.6;">This feedback is private — only you can see it. Log in to respond.</p>
                <a href="${baseUrl}" style="display:inline-block;background:#0E679D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View &amp; Respond in Dashboard</a>
              </div>
            `,
          }).catch(() => {});
        }
      }

      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ── Protected routes (requireAuth) ───────────────────────────────────────

  // Customers
  app.get("/api/customers", requireAuth, async (req, res) => {
    const cs = await storage.getCustomers(req.session.accountId!);
    res.json(cs);
  });
  app.get("/api/customers/archived", requireAuth, async (req, res) => {
    const cs = await storage.getArchivedCustomers(req.session.accountId!);
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
    const { scheduledSendDate, ...customerData } = req.body;
    const scheduledSendAt = scheduledSendDate ? new Date(scheduledSendDate) : null;
    const c = await storage.createCustomer({
      ...customerData,
      accountId: req.session.accountId,
      status: scheduledSendAt ? "scheduled" : customerData.status,
    });
    await storage.createActivity({
      id: randomUUID(),
      accountId: req.session.accountId!,
      type: "customer_added",
      customerId: c.id,
      customerName: c.name,
      message: scheduledSendAt
        ? `${c.name} added — review request scheduled for ${scheduledSendAt.toLocaleDateString("en-GB")}`
        : `${c.name} added as a customer`,
      metadata: "{}",
    });
    if (scheduledSendAt && !isNaN(scheduledSendAt.getTime())) {
      const rr = await storage.createReviewRequest({
        id: randomUUID(),
        accountId: req.session.accountId!,
        customerId: c.id,
        channel: c.channel,
        status: "scheduled",
        sentAt: new Date(),
        scheduledAt: scheduledSendAt,
      });
      await pool.query(
        `UPDATE review_requests SET scheduled_send_at = $1, schedule_status = 'pending' WHERE id = $2`,
        [scheduledSendAt, rr.id]
      );
    }
    res.json(c);
  });
  app.post("/api/customers/import", requireAuth, async (req, res) => {
    const customers: any[] = req.body.customers || [];
    let imported = 0;
    const skipped: { row: number; reason: string }[] = [];
    for (let i = 0; i < customers.length; i++) {
      const row = customers[i];
      const rowNum = i + 2; // +2 because row 1 is header
      if (!row.name) { skipped.push({ row: rowNum, reason: "name is required" }); continue; }
      if (!row.email && !row.phone) { skipped.push({ row: rowNum, reason: "email or phone required" }); continue; }
      try {
        await storage.createCustomer({
          id: randomUUID(),
          name: row.name,
          email: row.email || "",
          phone: row.phone || "",
          serviceType: row.service_type || "",
          serviceDate: row.service_date || null,
          notes: row.notes || "",
          namePronunciation: "",
          accountId: req.session.accountId,
        });
        imported++;
      } catch {
        skipped.push({ row: rowNum, reason: "failed to save" });
      }
    }
    res.json({ imported, skipped });
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

  app.post("/api/customers/:id/reactivate", requireAuth, async (req, res) => {
    await storage.reactivateCustomer(String(req.params.id), req.session.accountId!);
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
      const { channel, templateType } = req.body;
      const settings = await storage.getSettings(req.session.accountId!);
      const businessName = settings?.businessName || "our business";

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "OpenAI API key not configured" });
      }

      const isSMS = channel === "sms" || channel === "whatsapp";
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Build prompt based on template purpose
      let bodyPrompt = "";
      let openingPrompt = "";

      if (templateType === "response_positive") {
        bodyPrompt = `Write a variation of this message shown to a customer after they give a high rating. Keep the same tone, structure and purpose — expressing appreciation and mentioning the business and service. Use {{business_name}} and {{service_type}} merge tags.\n\nExample: "We hope you enjoyed your experience with {{business_name}} and our {{service_type}}! Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!"\n\nWrite a fresh variation. Same purpose, different wording.`;

      } else if (templateType === "response_negative") {
        openingPrompt = `Write a single short sentence (no more than 10 words) thanking a customer for their feedback after a low rating. No business name. No quotes.`;
        bodyPrompt = `Write a variation of this message shown to a customer after they give a low rating. Keep the same tone and purpose — apologising and letting them know you will be in touch. Use {{first_name}}.\n\nExample: "Hi {{first_name}},\n\nSorry to hear you did not have the experience what you expected. We would appreciate your feedback on how we can improve for next time and will be in touch.\n\nMany thanks"\n\nWrite a fresh variation. Same purpose, different wording.`;

      } else if (templateType === "follow_up_1") {
        bodyPrompt = isSMS
          ? `SMS follow-up text for ${businessName}. Rules: NO greeting, do NOT start with Hi or Dear or any name. NO link. MAX 86 characters. Just a short friendly nudge. Example output: "Just checking in — we'd love to hear how we did!"`
          : `Write a friendly first follow-up email for "${businessName}" to a customer who gave a high rating but hasn't yet shared their experience publicly. Gentle nudge — let them know a link is waiting below. Use {{first_name}}, {{business_name}}. 2–3 sentences. Start with "Hi {{first_name}}," — just the body, no subject, no sign-off, no link.`;
        openingPrompt = !isSMS ? `Write a short, friendly subject line for a first follow-up email from "${businessName}" asking a happy customer to share their experience. No quotes.` : "";

      } else if (templateType === "follow_up_2") {
        bodyPrompt = isSMS
          ? `SMS second follow-up text for ${businessName}. Rules: NO greeting, do NOT start with Hi or Dear or any name. NO link. MAX 86 characters. Short and warm — explain how much feedback means. Example output: "Your feedback really means a lot to us — tap below when you're ready!"`
          : `Write a second follow-up email for "${businessName}" to a customer who gave a high rating but still hasn't shared their experience. More heartfelt — explain why it matters. A link is waiting below. Use {{first_name}}, {{business_name}}. 2–3 sentences. Start with "Hi {{first_name}}," — just the body, no subject, no sign-off, no link.`;
        openingPrompt = !isSMS ? `Write a short, warm subject line for a second follow-up email from "${businessName}" asking a happy customer to share their experience. No quotes.` : "";

      } else if (templateType === "follow_up_3") {
        bodyPrompt = isSMS
          ? `SMS final follow-up text for ${businessName}. Rules: NO greeting, do NOT start with Hi or Dear or any name. NO link. MAX 86 characters. Kind and low pressure — last ask. Example output: "Last one from us — we'd still love your feedback if you get a moment!"`
          : `Write a final follow-up email for "${businessName}" to a customer who gave a high rating but hasn't shared their experience after two reminders. Kind, no-pressure tone. A link is waiting below. Use {{first_name}}, {{business_name}}. 2–3 sentences. Start with "Hi {{first_name}}," — just the body, no subject, no sign-off, no link.`;
        openingPrompt = !isSMS ? `Write a short, gentle subject line for a final follow-up email from "${businessName}" asking a happy customer to share their experience. No quotes.` : "";

      } else {
        // Generic / custom template
        bodyPrompt = isSMS
          ? `Write a friendly, personalised SMS message for a business called "${businessName}" to send to a customer. Use {{first_name}} and {{business_name}} merge tags. Keep it under 160 characters. Just the message text.`
          : `Write a friendly, personalised email message for "${businessName}" to send to a customer. Use {{first_name}}, {{business_name}}, and {{service_type}} merge tags. 3–4 sentences. Start with "Hi {{first_name}}," — just the body text, no subject line, no sign-off.`;
        openingPrompt = !isSMS ? `Write a short email subject line for a message from "${businessName}" to a customer. Just the subject text, no quotes.` : "";
      }

      const systemMsg = (templateType === "response_positive" || templateType === "response_negative")
        ? "You write short dialogue messages shown on a webpage after a customer submits a rating. Review platform buttons are already shown on the page. You must NEVER mention reviews, platforms (Google, Trustpilot etc), links, or ask the customer to take any action. Only write what is explicitly asked."
        : "You write customer message templates for a review management platform. Follow the instructions precisely.";

      const requests: Promise<any>[] = [
        openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemMsg }, { role: "user", content: bodyPrompt }], max_tokens: 300 }),
      ];
      if (openingPrompt) {
        requests.push(openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemMsg }, { role: "user", content: openingPrompt }], max_tokens: 60 }));
      }

      const [bodyResult, openingResult] = await Promise.all(requests);
      const cleanBody = (text: string) =>
        text.replace(/[^\n]*\{\{review_link\}\}[^\n]*/g, "").replace(/\n{3,}/g, "\n\n").trim();

      const isSmsFollowUp = channel === "sms" && templateType?.startsWith("follow_up");
      const SMS_FOLLOW_UP_LIMIT = 86;

      let body = cleanBody(bodyResult.choices[0]?.message?.content || "");

      if (isSmsFollowUp) {
        // Collapse newlines and extra spaces — SMS is single-line
        body = body.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
        // Always strip any greeting the AI added — SMS follow-ups never start with Hi/Dear/name
        body = body.replace(/^(Hi|Hello|Hey|Dear)\b[^,!.]*[,!.]?\s*/i, "");
        // Capitalise first letter after stripping
        body = body.charAt(0).toUpperCase() + body.slice(1);
        // Hard truncate at word boundary if still over limit
        if (body.length > SMS_FOLLOW_UP_LIMIT) {
          body = body.slice(0, SMS_FOLLOW_UP_LIMIT).replace(/\s+\S*$/, "").trimEnd();
        }
      }

      res.json({
        body,
        subject: openingResult ? openingResult.choices[0]?.message?.content?.trim() || "" : "",
      });
    } catch (err: any) {
      console.error("[ai/generate-template]", err.message);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  app.post("/api/review-requests", requireAuth, async (req, res) => {
    try {
    // Enforce Lite plan 10-request limit per calendar month (follow-ups don't count)
    const { rows: planRows } = await pool.query(
      `SELECT plan_type FROM users WHERE account_id = $1 AND role = 'owner' LIMIT 1`,
      [req.session.accountId]
    );
    if (planRows[0]?.plan_type === "lite") {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) as cnt FROM review_requests
         WHERE account_id = $1
           AND (follow_up_count IS NULL OR follow_up_count = 0)
           AND DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', NOW())`,
        [req.session.accountId]
      );
      if (parseInt(countRows[0]?.cnt || "0") >= 10) {
        // Next reset = 1st of next calendar month
        const now = new Date();
        const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return res.status(403).json({
          message: "Monthly review request limit reached.",
          code: "lite_limit_reached",
          resetDate: resetDate.toISOString(),
        });
      }
    }

    const customer = await storage.getCustomer(req.body.customerId, req.session.accountId!);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    if (customer.doNotContact) return res.status(400).json({ message: "This customer is marked as Do Not Contact and cannot be sent a review request." });

    // Validate contact info BEFORE creating DB record so we can return a real error
    const channel = req.body.channel || customer.channel;
    const settings = await storage.getSettings(req.session.accountId!);
    if (!settings) return res.status(400).json({ message: "Account settings not found. Please complete your settings first." });
    if (channel === "email" && !customer.email) {
      return res.status(400).json({ message: "This customer has no email address. Update their record or switch to SMS/WhatsApp." });
    }
    if ((channel === "sms" || channel === "whatsapp") && !customer.phone) {
      return res.status(400).json({ message: "This customer has no phone number. Update their record or switch to Email." });
    }

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
    const positiveTemplateId: string | undefined = req.body.positiveTemplateId || undefined;
    const negativeTemplateId: string | undefined = req.body.negativeTemplateId || undefined;
    if (positiveTemplateId) {
      await pool.query(`UPDATE review_requests SET positive_template_id = $1 WHERE id = $2`, [positiveTemplateId, rr.id]).catch(() => {});
    }
    if (negativeTemplateId) {
      await pool.query(`UPDATE review_requests SET negative_template_id = $1 WHERE id = $2`, [negativeTemplateId, rr.id]).catch(() => {});
    }
    // If a recording was sent, store its URL so the landing page can show it after rating
    const recordingId: string | undefined = req.body.recordingId || undefined;
    if (recordingId) {
      const { rows: recRows } = await pool.query(
        `SELECT type, url FROM recordings WHERE id = $1 AND account_id = $2`,
        [recordingId, req.session.accountId]
      ).catch(() => ({ rows: [] as any[] }));
      if (recRows.length > 0) {
        await pool.query(
          `UPDATE review_requests SET recording_url = $1, recording_type = $2 WHERE id = $3`,
          [recRows[0].url, recRows[0].type, rr.id]
        ).catch(() => {});
      }
    }
    // Update customer status and log activity immediately regardless of schedule
    await storage.updateCustomer(customer.id, { status: "request_sent" }, req.session.accountId!);
    const scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : new Date();
    const sendDelay = Math.max(0, scheduledAt.getTime() - Date.now());
    const isScheduled = sendDelay > 5000;
    console.log(`[schedule] raw=${req.body.scheduledAt} parsed=${scheduledAt.toISOString()} delay=${sendDelay}ms isScheduled=${isScheduled}`);
    await storage.createActivity({
      id: randomUUID(),
      accountId: req.session.accountId!,
      type: "request_sent",
      customerId: customer.id,
      customerName: customer.name,
      message: isScheduled
        ? `Review request scheduled for ${customer.name} via ${req.body.channel || customer.channel} at ${scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : `Review request sent to ${customer.name} via ${req.body.channel || customer.channel}`,
      metadata: "{}",
    });

    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
    const ratingLink = `${appUrl}/review?rid=${rr.id}`;
    const smsLink = `${appUrl}/r/${rr.id}`;
    const firstName = customer.name.split(" ")[0];

    const doSend = async () => {
      if (channel === "email") {
        await sendPreScreenEmail(customer, settings, rr.id, appUrl);
      } else if (channel === "sms") {
        const body = `Hi ${firstName}, thanks for choosing ${settings.businessName}! Tap the link below to rate your experience — it only takes a second:\n${smsLink}`;
        await sendReviewSMS(customer, settings, { subject: "", body } as any, []);
      } else if (channel === "whatsapp") {
        const body = `Hi ${firstName} 👋\n\nThank you for choosing ${settings.businessName}! We'd love to hear how we did.\n\nTap the link below to rate your experience — it only takes a second:\n${ratingLink}\n\nReply STOP to opt out.`;
        await sendWhatsAppMessage(customer.phone!, body);
      }
    };

    if (isScheduled) {
      // Fire-and-forget for scheduled sends — we can't await a future time before responding
      setTimeout(async () => {
        try { await doSend(); } catch (err: any) {
          console.error(`[review request] Scheduled send failed for ${channel} to ${customer.name}:`, err.message);
        }
      }, sendDelay);
    } else {
      // Immediate send — await so any error surfaces to the frontend
      await doSend();
    }

    res.json({ ...rr, scheduledAt: scheduledAt.toISOString(), isScheduled });
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

  // Reviews
  app.get("/api/reviews", requireAuth, async (req, res) => {
    res.json(await storage.getReviews(req.session.accountId!));
  });

  // Private Feedback (GET/PATCH — protected; POST is public above)
  app.get("/api/private-feedback", requireAuth, async (req, res) => {
    const rows = await pool.query(`
      SELECT pf.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             rr.channel as request_channel
      FROM private_feedback pf
      LEFT JOIN customers c ON c.id = pf.customer_id
      LEFT JOIN review_requests rr ON rr.id = pf.review_request_id
      WHERE pf.account_id = $1
      ORDER BY pf.created_at DESC
    `, [req.session.accountId]);
    res.json(rows.rows);
  });
  app.patch("/api/private-feedback/:id/respond", requireAuth, async (req, res) => {
    const { response, replyChannel, replyMessage } = req.body;
    // At least one of response note or a reply must be provided
    if (!response?.trim() && !replyMessage?.trim()) return res.status(400).json({ message: "Response or reply message is required" });

    // If sending a reply to the customer, look up customer + settings
    if (replyChannel && replyMessage?.trim()) {
      const feedbackRow = await pool.query(`SELECT pf.*, c.email, c.phone, c.name FROM private_feedback pf LEFT JOIN customers c ON c.id = pf.customer_id WHERE pf.id = $1`, [req.params.id]);
      if (feedbackRow.rows.length === 0) return res.status(404).json({ message: "Not found" });
      const fb = feedbackRow.rows[0];
      const settings = await storage.getSettings(req.session.accountId!);
      const firstName = (fb.name || "").split(" ")[0] || "there";

      try {
        if (replyChannel === "email" && fb.email) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@reviewoptic.com";
          await resend.emails.send({
            from: settings?.ownerName
              ? `${settings.ownerName} - ${settings.businessName} <${fromEmail}>`
              : `${settings?.businessName || "ReviewOptic"} <${fromEmail}>`,
            to: fb.email,
            subject: `A message from ${settings?.businessName || "us"}`,
            html: `<p>Hi ${firstName},</p><p>${replyMessage.trim().replace(/\n/g, "<br/>")}</p><p>— The ${settings?.businessName || "team"}</p>`,
          });
        } else if (replyChannel === "sms" && fb.phone) {
          await sendPlainSMS(fb.phone, replyMessage.trim(), settings?.businessName);
        } else if (replyChannel === "whatsapp" && fb.phone) {
          await sendWhatsAppMessage(fb.phone, replyMessage.trim());
        }
      } catch (err: any) {
        console.error("[feedback-reply] Send failed:", err.message);
        return res.status(500).json({ message: `Failed to send ${replyChannel} reply: ${err.message}` });
      }
    }

    const f = await storage.updatePrivateFeedback(String(req.params.id), {
      responded: true,
      response: (response || replyMessage || "").trim(),
      respondedAt: new Date(),
    });
    if (!f) return res.status(404).json({ message: "Not found" });
    res.json(f);
  });

  app.patch("/api/private-feedback/:id/ignore", requireAuth, async (req, res) => {
    const f = await storage.updatePrivateFeedback(String(req.params.id), {
      responded: true,
      response: "ignored",
      respondedAt: new Date(),
    });
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

  app.post("/api/templates/reset-defaults", requireAuth, async (req, res) => {
    const { channel } = req.body as { channel: string };
    const accountId = req.session.accountId!;
    const defaults: Record<string, Record<string, { body: string; subject?: string }>> = {
      email: {
        response_positive: { body: "Thank you for your rating. Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{business_name}}", subject: "Thank you for your rating" },
        response_negative: { body: "We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}", subject: "We'd love to make this right" },
        follow_up_1: { body: "Just a quick follow-up from {{business_name}} — we'd love to hear how we did!\n\nTap the link below to leave your rating.\n\nThanks,\n{{owner_name}}\n{{business_name}}", subject: "Just checking in" },
        follow_up_2: { body: "We know you're busy, but your feedback really means a lot to {{business_name}}!\n\nTap the link below whenever you're ready.\n\nThanks,\n{{owner_name}}\n{{business_name}}", subject: "A polite reminder" },
        follow_up_3: { body: "This is our last message, we promise! If you ever have a moment, we'd still love to hear from you.\n\nTap the link below.\n\nThanks,\n{{owner_name}}\n{{business_name}}", subject: "We'd still love to hear from you" },
      },
      sms: {
        response_positive: { body: "Thank you for your rating. Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{business_name}}" },
        response_negative: { body: "We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}" },
        follow_up_1: { body: "Just a quick follow-up from {{business_name}} — we'd love to hear how we did!" },
        follow_up_2: { body: "Your feedback means a lot to us — tap below when you're ready!\n{{business_name}}" },
        follow_up_3: { body: "Last one from us! If you get a moment, we'd love your feedback.\n{{business_name}}" },
      },
      whatsapp: {
        response_positive: { body: "Thank you for your rating. Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{business_name}}" },
        response_negative: { body: "We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}" },
        follow_up_1: { body: "😊 Just a quick follow-up from {{business_name}} — we'd love to hear how we did! Tap the link below when you get a moment 👇" },
        follow_up_2: { body: "💛 Your feedback really means a lot to us! Whenever you're ready, just tap the link below — we appreciate it 🙏\n\n{{business_name}}" },
        follow_up_3: { body: "🙏 Last message from us, we promise! If you ever get a moment, we'd genuinely love to hear from you.\n\n{{business_name}}" },
      },
    };
    const channelDefaults = defaults[channel];
    if (!channelDefaults) return res.status(400).json({ message: "Invalid channel" });
    const names: Record<string, string> = { response_positive: "After 4–5★ Rating", response_negative: "After 1–3★ Rating", follow_up_1: "Follow-up 1", follow_up_2: "Follow-up 2", follow_up_3: "Follow-up 3" };
    try {
      for (const [type, vals] of Object.entries(channelDefaults)) {
        await pool.query(`DELETE FROM templates WHERE account_id = $1 AND channel = $2 AND template_type = $3`, [accountId, channel, type]);
        await pool.query(
          `INSERT INTO templates (id, account_id, name, template_type, channel, is_default, subject, body, preferred_platform, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, $6, '', NOW())`,
          [accountId, names[type] || type, type, channel, vals.subject || '', vals.body]
        );
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[reset-defaults] Error:", err.message);
      res.status(500).json({ message: err.message });
    }
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
  app.post("/api/templates/:id/test-send", requireAuth, async (req, res) => {
    try {
      const template = (await storage.getTemplates(req.session.accountId!)).find(t => t.id === req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });

      const settings = await storage.getSettings(req.session.accountId!);
      const user = await storage.getUser(req.session.userId!);
      if (!settings || !user) return res.status(400).json({ message: "Account not configured" });

      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Test User";
      const firstName = user.firstName || "there";
      const ownerFirstName = (settings.ownerName || "").split(" ")[0] || "your team";
      const resolvedBody = template.body
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{business_name\}\}/g, settings.businessName || "your business")
        .replace(/\{\{owner_name\}\}/g, ownerFirstName)
        .replace(/\{\{service_type\}\}/g, "your recent service")
        .replace(/\{\{customer_name\}\}/g, fullName)
        .replace(/\{\{review_link\}\}/g, "");

      if (template.channel === "email") {
        if (!user.email) return res.status(400).json({ message: "No email address on your account" });
        if (!process.env.RESEND_API_KEY) return res.status(503).json({ message: "Email not configured" });
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const subject = `[TEST] ${template.subject || "Template preview"}`;
        const opening = (template as any).opening || (template as any).subject || "";
        const bodyHtml = resolvedBody.replace(/\n/g, "<br>");
        await resend.emails.send({
          from: `${settings.businessName} <noreply@reviewoptic.com>`,
          to: user.email,
          subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:20px">
              This is a test — only you will receive this.
            </div>
            ${opening ? `<p style="font-weight:600;margin-bottom:12px">${opening}</p>` : ""}
            <div style="font-size:15px;line-height:1.6;color:#111">${bodyHtml}</div>
          </div>`,
        });
        return res.json({ message: `Test email sent to ${user.email}` });
      }

      const testPhone: string = (req.body.phone || "").trim();
      if (!testPhone) return res.status(400).json({ message: "Enter a phone number to send the test to", needsPhone: true });

      if (template.channel === "sms") {
        await sendPlainSMS(testPhone, `[TEST] ${resolvedBody}`);
        return res.json({ message: `Test SMS sent to ${testPhone}` });
      }

      if (template.channel === "whatsapp") {
        await sendWhatsAppMessage(testPhone, `[TEST] ${resolvedBody}`);
        return res.json({ message: `Test WhatsApp sent to ${testPhone}` });
      }

      res.status(400).json({ message: "Unknown channel" });
    } catch (err: any) {
      console.error("[test-send]", err.message);
      res.status(500).json({ message: err.message || "Failed to send test" });
    }
  });

  app.post("/api/templates/upload-video", requireAuth, videoUpload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
  app.post("/api/templates/upload-audio", requireAuth, audioUpload.single("audio"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Recording uploads (voice note + video) — stored in Cloudinary
  app.get("/api/recordings/status", requireAuth, (_req, res) => {
    res.json({ configured: isCloudinaryConfigured() });
  });

  // List all recordings for account
  app.get("/api/recordings", requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM recordings WHERE account_id = $1 ORDER BY type, created_at ASC`,
      [req.session.accountId]
    );
    res.json(rows);
  });

  // Upload a new recording (voice or video) — max 2 per type
  app.post("/api/recordings/upload", requireAuth, recordingUpload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const type = req.body.type as string; // 'voice' or 'video'
    const label = (req.body.label || "").trim() || (type === "voice" ? "Voice Note" : "Video Message");
    if (type !== "voice" && type !== "video") return res.status(400).json({ message: "type must be voice or video" });

    // Enforce max 2 per type
    const { rows: existing } = await pool.query(
      `SELECT id FROM recordings WHERE account_id = $1 AND type = $2`,
      [req.session.accountId, type]
    );
    if (existing.length >= 2) return res.status(400).json({ message: `Maximum of 2 ${type} recordings allowed` });

    try {
      // Try Cloudinary first; fall back to local serving if not configured or upload fails
      let url: string;
      if (isCloudinaryConfigured()) {
        try {
          const folder = type === "voice" ? "reviewoptic/voice-notes" : "reviewoptic/video-messages";
          url = await uploadToCloudinary(req.file.path, { folder, resource_type: "video" });
          fs.unlink(req.file.path, () => {});
        } catch (cloudErr: any) {
          console.warn("[recordings] Cloudinary upload failed, falling back to local:", cloudErr.message);
          url = `/uploads/${req.file.filename}`;
        }
      } else {
        url = `/uploads/${req.file.filename}`;
      }

      let elevenLabsVoiceId = "";
      if (type === "voice" && process.env.ELEVENLABS_API_KEY) {
        const settings = await storage.getSettings(req.session.accountId!);
        elevenLabsVoiceId = await cloneVoice(url, settings?.businessName || "ReviewOptic").catch(err => {
          console.error("[recordings] ElevenLabs clone failed:", err.message);
          return "";
        });
      }

      const id = randomUUID();
      await pool.query(
        `INSERT INTO recordings (id, account_id, type, label, url, elevenlabs_voice_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.session.accountId, type, label, url, elevenLabsVoiceId]
      );
      const { rows } = await pool.query(`SELECT * FROM recordings WHERE id = $1`, [id]);
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[recordings] upload failed:", err);
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  // Update recording label
  app.patch("/api/recordings/:id", requireAuth, async (req, res) => {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ message: "Label is required" });
    const { rows } = await pool.query(
      `UPDATE recordings SET label = $1 WHERE id = $2 AND account_id = $3 RETURNING *`,
      [label.trim(), req.params.id, req.session.accountId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  });

  // Delete a recording
  app.delete("/api/recordings/:id", requireAuth, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM recordings WHERE id = $1 AND account_id = $2`,
      [req.params.id, req.session.accountId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });
    const rec = rows[0];
    await deleteFromCloudinary(rec.url).catch(() => {});
    if (rec.elevenlabs_voice_id) await deleteVoice(rec.elevenlabs_voice_id).catch(() => {});
    await pool.query(`DELETE FROM recordings WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  });

  // Preview endpoint — generates stitched audio/video and serves it temporarily
  app.post("/api/recordings/preview", requireAuth, async (req, res) => {
    const { customerId, recordingId, phonetic } = req.body;
    if (!customerId || !recordingId) return res.status(400).json({ message: "Missing customerId or recordingId" });

    const { rows: recRows } = await pool.query(`SELECT * FROM recordings WHERE id = $1 AND account_id = $2`, [recordingId, req.session.accountId]);
    if (recRows.length === 0) return res.status(404).json({ message: "Recording not found" });
    const recording = recRows[0];
    if (recording.type === "voice" && !recording.elevenlabs_voice_id) return res.status(400).json({ message: "No voice clone for this recording — please re-upload" });

    const customer = await storage.getCustomer(customerId, req.session.accountId!);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const firstName = customer.name.split(" ")[0];
    const nameText = `${phonetic || customer.namePronunciation || firstName}!`;

    try {
      const nameAudioPath = await generateNameAudio(recording.elevenlabs_voice_id, nameText);
      const mergedPath = await stitchNameToFront(nameAudioPath, recording.url, recording.type === "voice" ? "audio" : "video");
      const previewId = randomUUID();
      previewFiles.set(previewId, { path: mergedPath, expires: Date.now() + 10 * 60 * 1000 });
      res.json({ previewId });
    } catch (err: any) {
      console.error("[preview] failed:", err.message);
      res.status(500).json({ message: "Failed to generate preview: " + err.message });
    }
  });

  app.get("/api/recordings/preview/:id", (req, res) => {
    const entry = previewFiles.get(req.params.id);
    if (!entry || Date.now() > entry.expires) return res.status(404).json({ message: "Preview expired" });
    res.sendFile(entry.path, { root: "/" });
  });
  app.post("/api/settings/upload-logo", requireAuth, logoUpload.single("logo"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    try {
      const url = await uploadBufferToCloudinary(req.file.buffer, "logos");
      res.json({ url });
    } catch (err) {
      console.error("Logo upload to Cloudinary failed:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    const s = await storage.getSettings(req.session.accountId!);
    res.json(s || {});
  });
  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.businessEmail !== undefined && !body.businessEmail?.trim()) {
        return res.status(400).json({ message: "Business email is required" });
      }
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
    const now = new Date();

    // Support either custom from/to or a days rolling window
    let cutoff: Date;
    let cutoffEnd: Date = now;
    let days: number;
    if (req.query.from && req.query.to) {
      const parsedFrom = new Date(req.query.from as string);
      const parsedTo = new Date(req.query.to as string);
      if (!isNaN(parsedFrom.getTime()) && !isNaN(parsedTo.getTime())) {
        cutoff = parsedFrom;
        cutoffEnd = parsedTo;
        cutoffEnd.setHours(23, 59, 59, 999);
        days = Math.max(1, Math.ceil((cutoffEnd.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000)));
      } else {
        days = 30;
        cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }
    } else if (req.query.days === "all") {
      cutoff = new Date("2000-01-01");
      days = Math.ceil((now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000));
    } else {
      days = parseInt((req.query.days as string) || "30");
      if (isNaN(days) || days <= 0) days = 30;
      cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const channel = (req.query.channel as string) || "all";
    const userId = req.query.userId as string | undefined;

    // Build WHERE clause fragments for review_requests queries
    const baseParams: any[] = [accountId, cutoff, cutoffEnd];
    let baseWhere = `account_id = $1 AND created_at >= $2 AND created_at <= $3`;
    if (channel !== "all") { baseParams.push(channel); baseWhere += ` AND channel = $${baseParams.length}`; }
    if (userId) { baseParams.push(userId); baseWhere += ` AND sent_by_user_id = $${baseParams.length}`; }

    // Core totals — all from review_requests
    const { rows: totals } = await pool.query(`
      SELECT COUNT(*) as sent,
             COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked
      FROM review_requests WHERE ${baseWhere}
    `, baseParams);
    const sent = parseInt(totals[0]?.sent || "0");
    const clicked = parseInt(totals[0]?.clicked || "0");

    // Daily requests (by sent date) and clicks (by click date) from review_requests
    const dailyData: Record<string, { date: string; requests: number; clicks: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(cutoff.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { date: key, requests: 0, clicks: 0 };
    }
    const { rows: dailyRows } = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as requests,
             COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicks
      FROM review_requests WHERE ${baseWhere}
      GROUP BY DATE(created_at)
    `, baseParams);
    dailyRows.forEach((r: any) => {
      const key = r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date);
      if (dailyData[key]) {
        dailyData[key].requests = parseInt(r.requests);
        dailyData[key].clicks = parseInt(r.clicks);
      }
    });

    // Daily by channel (all channels, ignore channel filter for this chart)
    const channelDailyData: Record<string, { date: string; email: number; sms: number; whatsapp: number; emailClicks: number; smsClicks: number; whatsappClicks: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(cutoff.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      channelDailyData[key] = { date: key, email: 0, sms: 0, whatsapp: 0, emailClicks: 0, smsClicks: 0, whatsappClicks: 0 };
    }
    const { rows: chDailyRows } = await pool.query(`
      SELECT DATE(created_at) as date, channel,
             COUNT(*) as requests,
             COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicks
      FROM review_requests WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE(created_at), channel
    `, [accountId, cutoff, cutoffEnd]);
    chDailyRows.forEach((r: any) => {
      const key = r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date);
      if (!channelDailyData[key]) return;
      const ch = r.channel as string;
      const req = parseInt(r.requests); const cl = parseInt(r.clicks);
      if (ch === "email") { channelDailyData[key].email += req; channelDailyData[key].emailClicks += cl; }
      else if (ch === "sms") { channelDailyData[key].sms += req; channelDailyData[key].smsClicks += cl; }
      else if (ch === "whatsapp") { channelDailyData[key].whatsapp += req; channelDailyData[key].whatsappClicks += cl; }
    });

    // Channel breakdown
    const { rows: cbRows } = await pool.query(`
      SELECT channel, COUNT(*) as cnt
      FROM review_requests WHERE ${baseWhere}
      GROUP BY channel
    `, baseParams);
    const channelBreakdown = { email: 0, sms: 0, whatsapp: 0 };
    cbRows.forEach((r: any) => {
      const ch = r.channel as keyof typeof channelBreakdown;
      if (channelBreakdown[ch] !== undefined) channelBreakdown[ch] = parseInt(r.cnt);
    });


    // Per-user breakdown (owner only)
    let byUser: any[] = [];
    try {
      const { rows: userRows } = await pool.query(`
        SELECT u.first_name, u.last_name, u.email, u.role,
               COUNT(rr.id) as requests_sent,
               COUNT(CASE WHEN rr.status = 'clicked' THEN 1 END) as clicked
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
        clicked: parseInt(r.clicked) || 0,
      }));
    } catch { /* column may not exist on older installs */ }

    // Best day to send — based on which day of week clicks actually happen
    let bestDayData: any[] = [];
    try {
      const { rows: dowRows } = await pool.query(`
        SELECT EXTRACT(DOW FROM clicked_at)::int as dow,
               COUNT(*) as clicks
        FROM review_requests
        WHERE account_id = $1 AND clicked_at >= $2 AND clicked_at <= $3
        GROUP BY dow ORDER BY dow
      `, [accountId, cutoff, cutoffEnd]);
      const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      bestDayData = DOW_NAMES.map((name, i) => {
        const row = dowRows.find((r: any) => r.dow === i);
        const clicks = parseInt(row?.clicks || "0");
        return { day: name, clicked: clicks };
      });
    } catch { /* ignore */ }

    // Follow-up effectiveness
    let followUpData: any[] = [];
    try {
      const { rows: fuRows } = await pool.query(`
        SELECT
          CASE
            WHEN followup_count = 0 THEN 'No follow-up'
            WHEN followup_count = 1 THEN '1 follow-up'
            WHEN followup_count = 2 THEN '2 follow-ups'
            ELSE '3 follow-ups'
          END as bucket,
          COUNT(*) as customers,
          COUNT(CASE WHEN has_clicked THEN 1 END) as clicked
        FROM (
          SELECT rr.customer_id,
                 COUNT(CASE WHEN rr.follow_up_count > 0 THEN 1 END) as followup_count,
                 bool_or(rr.status = 'clicked') as has_clicked
          FROM review_requests rr
          WHERE rr.account_id = $1 AND rr.created_at >= $2 AND rr.created_at <= $3
          GROUP BY rr.customer_id
        ) t
        GROUP BY bucket
        ORDER BY bucket
      `, [accountId, cutoff, cutoffEnd]);
      const FU_BUCKETS = ["No follow-up", "1 follow-up", "2 follow-ups", "3 follow-ups"];
      followUpData = FU_BUCKETS.map(bucket => {
        const row = fuRows.find((r: any) => r.bucket === bucket);
        const customers = parseInt(row?.customers || "0");
        const clicks = parseInt(row?.clicked || "0");
        return { bucket, customers, clicked: clicks, clickRate: customers > 0 ? Math.round((clicks / customers) * 100) : 0 };
      });
    } catch { /* ignore */ }

    // Template performance
    let templatePerformance: any[] = [];
    try {
      const { rows: tplRows } = await pool.query(`
        SELECT t.name as template_name,
               COUNT(rr.id) as total_sent,
               COUNT(CASE WHEN rr.status = 'clicked' THEN 1 END) as clicked
        FROM templates t
        LEFT JOIN review_requests rr ON rr.template_id = t.id
          AND rr.account_id = $1
          AND rr.created_at >= $2 AND rr.created_at <= $3
        WHERE t.account_id = $1
        GROUP BY t.id, t.name
        HAVING COUNT(rr.id) > 0
        ORDER BY clicked DESC
      `, [accountId, cutoff, cutoffEnd]);
      templatePerformance = tplRows.map((r: any) => ({
        name: r.template_name,
        sent: parseInt(r.total_sent),
        clicked: parseInt(r.clicked),
        clickRate: parseInt(r.total_sent) > 0 ? Math.round((parseInt(r.clicked) / parseInt(r.total_sent)) * 100) : 0,
      }));
    } catch { /* ignore */ }

    // Sentiment: average rating + distribution + over time (all rated requests, regardless of outcome)
    let averageRating: number | null = null;
    let ratingDistribution: Array<{ stars: number; count: number }> = [1,2,3,4,5].map(s => ({ stars: s, count: 0 }));
    let sentimentSplit = { positive: 0, negative: 0, positiveRate: 0 };
    let ratingOverTime: Array<{ date: string; avg: number; count: number }> = [];
    let privateFeedbackCount = 0;
    let avgResponseTimeHours: number | null = null;
    try {
      const { rows: ratingRows } = await pool.query(`
        SELECT AVG(rating)::numeric(4,2) as avg_rating,
               COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive,
               COUNT(CASE WHEN rating <= 3 THEN 1 END) as negative,
               COUNT(*) as total
        FROM review_requests
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3 AND rating IS NOT NULL
      `, [accountId, cutoff, cutoffEnd]);
      if (ratingRows[0]?.total > 0) {
        averageRating = parseFloat(ratingRows[0].avg_rating) || null;
        const pos = parseInt(ratingRows[0].positive) || 0;
        const neg = parseInt(ratingRows[0].negative) || 0;
        const total = pos + neg;
        sentimentSplit = { positive: pos, negative: neg, positiveRate: total > 0 ? Math.round((pos / total) * 100) : 0 };
      }

      const { rows: distRows } = await pool.query(`
        SELECT rating, COUNT(*) as cnt
        FROM review_requests
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3 AND rating IS NOT NULL
        GROUP BY rating ORDER BY rating
      `, [accountId, cutoff, cutoffEnd]);
      ratingDistribution = [1,2,3,4,5].map(s => {
        const row = distRows.find((r: any) => parseInt(r.rating) === s);
        return { stars: s, count: row ? parseInt(row.cnt) : 0 };
      });

      const { rows: rotRows } = await pool.query(`
        SELECT DATE(created_at) as date,
               AVG(rating)::numeric(4,2) as avg_rating,
               COUNT(*) as cnt
        FROM review_requests
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3 AND rating IS NOT NULL
        GROUP BY DATE(created_at) ORDER BY DATE(created_at)
      `, [accountId, cutoff, cutoffEnd]);
      ratingOverTime = rotRows.map((r: any) => ({
        date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
        avg: parseFloat(r.avg_rating) || 0,
        count: parseInt(r.cnt) || 0,
      }));

      const { rows: pfRows } = await pool.query(`
        SELECT COUNT(*) as cnt FROM private_feedback
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
      `, [accountId, cutoff, cutoffEnd]);
      privateFeedbackCount = parseInt(pfRows[0]?.cnt) || 0;

      const { rows: rtRows } = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600)::numeric(10,2) as avg_hours
        FROM private_feedback
        WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3 AND responded_at IS NOT NULL
      `, [accountId, cutoff, cutoffEnd]);
      avgResponseTimeHours = rtRows[0]?.avg_hours ? parseFloat(rtRows[0].avg_hours) : null;
    } catch { /* ignore */ }

    // Customer pipeline: current status breakdown for customers active in this period
    let pipelineData: { status: string; label: string; count: number }[] = [];
    try {
      const { rows: plRows } = await pool.query(`
        SELECT c.status, COUNT(*)::int as count
        FROM customers c
        WHERE c.account_id = $1
          AND c.id IN (
            SELECT DISTINCT customer_id FROM review_requests
            WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
          )
        GROUP BY c.status
      `, [accountId, cutoff, cutoffEnd]);
      const PIPELINE_ORDER = [
        { status: "request_sent", label: "Request Sent" },
        { status: "follow_up_1_sent", label: "Follow-up 1 Sent" },
        { status: "follow_up_2_sent", label: "Follow-up 2 Sent" },
        { status: "follow_up_3_sent", label: "Follow-up 3 Sent" },
        { status: "clicked", label: "Clicked" },
        { status: "no_response", label: "No Response" },
      ];
      pipelineData = PIPELINE_ORDER.map(({ status, label }) => {
        const row = plRows.find((r: any) => r.status === status);
        return { status, label, count: row ? parseInt(row.count) : 0 };
      }).filter(d => d.count > 0);
    } catch { /* ignore */ }

    // Content type performance (text vs voice vs video)
    let contentTypeData: { type: string; label: string; sent: number; platformClicked: number; clickRate: number }[] = [];
    try {
      const { rows: ctRows } = await pool.query(`
        SELECT
          COALESCE(rr.recording_type, 'text') as content_type,
          COUNT(*)::int as sent,
          COUNT(DISTINCT pc.request_id)::int as platform_clicked
        FROM review_requests rr
        LEFT JOIN review_platform_clicks pc ON pc.request_id = rr.id AND pc.account_id = $1
        WHERE rr.account_id = $1 AND rr.created_at >= $2 AND rr.created_at <= $3
        GROUP BY content_type
      `, baseParams);
      const LABELS: Record<string, string> = { text: "Text only", voice: "Voice Note", video: "Video" };
      const ctMap: Record<string, any> = {};
      for (const r of ctRows) {
        const key = LABELS[r.content_type] ? r.content_type : "text"; // bucket unknowns into text
        ctMap[key] = { sent: (ctMap[key]?.sent || 0) + r.sent, platform_clicked: (ctMap[key]?.platform_clicked || 0) + r.platform_clicked };
      }
      contentTypeData = ["text", "voice", "video"].map(type => {
        const r = ctMap[type] || { sent: 0, platform_clicked: 0 };
        return { type, label: LABELS[type], sent: r.sent, platformClicked: r.platform_clicked, clickRate: r.sent > 0 ? Math.round((r.platform_clicked / r.sent) * 100) : 0 };
      });
    } catch { /* ignore */ }

    // Platform click breakdown
    let platformClicks: { platform: string; count: number }[] = [];
    try {
      const { rows: pcRows } = await pool.query(`
        SELECT platform, COUNT(*)::int as count
        FROM review_platform_clicks
        WHERE account_id = $1 AND clicked_at >= $2 AND clicked_at <= $3
        GROUP BY platform ORDER BY count DESC
      `, [accountId, cutoff, cutoffEnd]);
      platformClicks = pcRows.map(r => ({ platform: r.platform, count: r.count }));
    } catch { /* ignore */ }

    res.json({
      daily: Object.values(dailyData),
      dailyByChannel: Object.values(channelDailyData),
      funnel: { sent, clicked },
      channelBreakdown,
      summary: { sent, clicks: clicked, clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0 },
      byUser,
      bestDayData,
      followUpData,
      templatePerformance,
      averageRating,
      ratingDistribution,
      sentimentSplit,
      ratingOverTime,
      privateFeedbackCount,
      avgResponseTimeHours,
      platformClicks,
      pipelineData,
      contentTypeData,
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
      // Also fetch linked Instagram Business Account
      let instagramBusinessAccountId = "";
      try {
        const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
        const igData = await igRes.json() as any;
        instagramBusinessAccountId = igData.instagram_business_account?.id || "";
      } catch { /* optional */ }
      await storage.upsertSettings(accountId, { facebookPageAccessToken: page.access_token, facebookPageId: page.id, instagramBusinessAccountId });
      res.redirect(`${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")}/?tab=settings&connected=facebook`);
    } catch (err) {
      console.error("Facebook OAuth error:", err);
      res.status(500).send("Facebook OAuth failed. Check server logs.");
    }
  });

  app.delete("/api/social/facebook", requireAuth, async (req, res) => {
    await storage.upsertSettings(req.session.accountId!, { facebookPageAccessToken: "", facebookPageId: "", instagramBusinessAccountId: "" });
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
    lite_monthly: { unit_amount: 2900,  interval: "month", name: "Lite Plan (Monthly)" },
    lite_annual:  { unit_amount: 31900, interval: "year",  name: "Lite Plan (Annual)" },
    pro_monthly:  { unit_amount: 4900,  interval: "month", name: "Pro Plan (Monthly)" },
    pro_annual:   { unit_amount: 53900, interval: "year",  name: "Pro Plan (Annual)" },
  };

  app.get("/api/billing/config", (_req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "" });
  });

  app.post("/api/billing/create-checkout-session", requireAuth, async (req, res) => {
    const { plan, period } = req.body;
    const key = `${plan}_${period}`;
    if (!PRICES[key]) return res.status(400).json({ message: "Invalid plan or period" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe is not configured" });

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Check if this user has ever had a subscription — existing subscribers don't get a trial
      const { rows: subRows } = await pool.query(
        `SELECT stripe_customer_id FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const isNewSubscriber = !subRows[0]?.stripe_customer_id;

      const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}` || "http://localhost:5000";
      const price = PRICES[key];

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
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
        ...(isNewSubscriber ? { subscription_data: { trial_period_days: 30 } } : {}),
        allow_promotion_codes: true,
        return_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        metadata: { userId: user.id, plan, period },
      });

      res.json({ clientSecret: session.client_secret });
    } catch (err: any) {
      console.error("[billing] create-checkout-session failed:", err?.message, err?.type, err?.code);
      return res.status(500).json({ message: err?.message || "Failed to create checkout session" });
    }
  });

  app.get("/api/billing/confirm", async (req, res) => {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId) return res.status(400).json({ message: "Missing session_id" });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });

    try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    console.log("[billing/confirm] status:", session.status, "payment_status:", session.payment_status, "metadata:", session.metadata);

    if (session.status !== "complete") {
      console.log("[billing/confirm] Not complete — aborting");
      return res.status(400).json({ message: "Payment not completed" });
    }

    const { plan, period, userId } = session.metadata || {};
    if (!plan || !period || !userId || !PRICES[`${plan}_${period}`]) {
      console.log("[billing/confirm] Invalid metadata:", { plan, period, userId });
      return res.status(400).json({ message: "Invalid session metadata" });
    }

    const customerId = typeof session.customer === "string" ? session.customer : (session.customer as any)?.id ?? "";
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id ?? "";

    const { rows: prevRows } = await pool.query(`SELECT cancelled_at, stripe_subscription_id FROM users WHERE id = $1`, [userId]);
    const wasCancelled = !!prevRows[0]?.cancelled_at;
    const oldSubId = prevRows[0]?.stripe_subscription_id;

    // If user is switching plans and has an existing subscription, cancel the old one immediately
    if (oldSubId && oldSubId !== subscriptionId) {
      await stripe.subscriptions.cancel(oldSubId).catch(err =>
        console.error("[billing/confirm] Failed to cancel old subscription:", err.message)
      );
    }

    // Fetch subscription to capture trial_end if present
    let trialEndsAt: Date | null = null;
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId).catch(() => null) as any;
      if (sub?.trial_end) trialEndsAt = new Date(sub.trial_end * 1000);
    }

    await pool.query(
      `UPDATE users SET plan_type = $1, plan_period = $2, stripe_customer_id = $3, stripe_subscription_id = $4, trial_ends_at = $5, trial_reminder_sent = false, scheduled_for_deletion_at = NULL${wasCancelled ? ", reactivated_at = NOW()" : ""} WHERE id = $6`,
      [plan, period, customerId, subscriptionId, trialEndsAt, userId]
    );

    // Send verification email now that payment is confirmed
    const { rows: userRows } = await pool.query(`SELECT email, verification_token, email_verified, referred_by_account_id, referral_rewarded FROM users WHERE id = $1`, [userId]);
    const paidUser = userRows[0];
    if (paidUser && !paidUser.email_verified && paidUser.verification_token) {
      const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
      const verifyUrl = `${appUrl}/verify-email?token=${paidUser.verification_token}`;
      await sendVerificationEmail(paidUser.email, verifyUrl).catch(err =>
        console.error("[billing/confirm] Failed to send verification email:", err.message)
      );
    }

    // Referral reward: if this user was referred and hasn't been rewarded yet, credit the referrer 1 month free
    // Credit is based on the referred person's plan price (locked at time of referral, unaffected by future plan changes)
    if (paidUser && paidUser.referred_by_account_id && !paidUser.referral_rewarded) {
      try {
        const { rows: referrerRows } = await pool.query(
          `SELECT stripe_customer_id FROM users WHERE account_id = $1 AND role = 'owner' LIMIT 1`,
          [paidUser.referred_by_account_id]
        );
        const referrerCustomerId = referrerRows[0]?.stripe_customer_id;
        if (referrerCustomerId && subscriptionId) {
          // Get the referred user's plan price to credit the exact amount
          const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
          const unitAmount = (sub.items.data[0]?.price as any)?.unit_amount ?? 0;
          const currency = (sub.items.data[0]?.price as any)?.currency ?? "gbp";
          if (unitAmount > 0) {
            // Add a negative balance transaction — credits stack and auto-apply to future invoices
            await stripe.customers.createBalanceTransaction(referrerCustomerId, {
              amount: -unitAmount,
              currency,
              description: "Referral reward — 1 free month",
            });
            console.log(`[billing/confirm] Referral credit of ${unitAmount} ${currency} added to customer ${referrerCustomerId}`);
          }
        }
        // Mark as rewarded regardless (prevents double-rewarding if Stripe call fails partially)
        await pool.query(`UPDATE users SET referral_rewarded = true WHERE id = $1`, [userId]);
      } catch (err: any) {
        console.error("[billing/confirm] Failed to apply referral reward:", err.message);
      }
    }

    res.json({ success: true, plan, period });
    } catch (err: any) {
      console.error("[billing/confirm] Error:", err?.message, err?.type, err?.code);
      res.status(500).json({ message: err?.message || "Failed to confirm payment" });
    }
  });

  // Referral stats — how many successful (paid) referrals this user has made
  app.get("/api/referrals/stats", requireAuth, async (req, res) => {
    try {
      const { rows: userRows } = await pool.query(`SELECT account_id FROM users WHERE id = $1`, [req.session.userId]);
      const accountId = userRows[0]?.account_id;
      if (!accountId) return res.json({ count: 0 });
      const { rows } = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE referred_by_account_id = $1 AND referral_rewarded = true`,
        [accountId]
      );
      res.json({ count: parseInt(rows[0]?.count ?? "0", 10) });
    } catch (err: any) {
      res.json({ count: 0 });
    }
  });

  app.get("/api/billing/status", requireAuth, async (req, res) => {
    try {
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
    } catch (err: any) {
      console.error("[billing/status] Error:", err?.message);
      res.status(500).json({ message: "Failed to fetch billing status" });
    }
  });

  app.get("/api/billing/subscription", requireAuth, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
    try {
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
        await pool.query(`UPDATE users SET plan_type = 'cancelled', cancelled_at = NOW() WHERE id = $1`, [req.session.userId]);
      }

      res.json({
        subscription: {
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: sub.trial_end || null,
          planType: row.plan_type,
          planPeriod: row.plan_period,
        },
      });
    } catch (err: any) {
      console.error("[billing/subscription] Error:", err?.message);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.get("/api/billing/invoices", requireAuth, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
    try {
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
    } catch (err: any) {
      console.error("[billing/invoices] Error:", err?.message);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
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

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────

  // Get in-app notifications for current account
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const accountId = req.session.accountId;
    const { rows } = await pool.query(
      `SELECT id, type, title, body, link, read, created_at FROM notifications WHERE account_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [accountId]
    );
    res.json(rows);
  });

  // Mark notifications as read
  app.post("/api/notifications/mark-read", requireAuth, async (req, res) => {
    const accountId = req.session.accountId;
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      await pool.query(`UPDATE notifications SET read = true WHERE account_id = $1`, [accountId]);
    } else {
      await pool.query(`UPDATE notifications SET read = true WHERE account_id = $1 AND id = ANY($2)`, [accountId, ids]);
    }
    res.json({ ok: true });
  });

  // Get VAPID public key for push subscription
  app.get("/api/push/vapid-public-key", requireAuth, (_req, res) => {
    res.json({ key: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    const accountId = (req as any).user.accountId;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) return res.status(400).json({ message: "Invalid subscription" });
    await pool.query(
      `INSERT INTO push_subscriptions (id, account_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET account_id = $2, p256dh = $4, auth = $5`,
      [randomUUID(), accountId, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ ok: true });
  });

  // Unsubscribe from push notifications
  app.delete("/api/push/unsubscribe", requireAuth, async (req, res) => {
    const accountId = (req as any).user.accountId;
    const { endpoint } = req.body;
    if (endpoint) {
      await pool.query(`DELETE FROM push_subscriptions WHERE account_id = $1 AND endpoint = $2`, [accountId, endpoint]);
    } else {
      await pool.query(`DELETE FROM push_subscriptions WHERE account_id = $1`, [accountId]);
    }
    res.json({ ok: true });
  });

  // Cancel subscription at period end
  app.post("/api/billing/cancel", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });

      // Verify password before cancelling
      const { password } = req.body;
      if (!password) return res.status(400).json({ message: "Password is required to confirm cancellation." });
      const { rows: pwRows } = await pool.query(`SELECT password FROM users WHERE id = $1`, [req.session.userId]);
      const passwordMatch = await bcrypt.compare(password, pwRows[0]?.password);
      if (!passwordMatch) return res.status(401).json({ message: "Incorrect password — please try again." });

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

  // Data export — GDPR portable format
  app.get("/api/account/export", requireAuth, async (req, res) => {
    const accountId = req.session.accountId!;
    const [customerRows, requestRows, feedbackRows, userRows] = await Promise.all([
      pool.query(`SELECT name, email, phone, status, created_at FROM customers WHERE account_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`, [accountId]),
      pool.query(`SELECT c.name AS customer_name, rr.channel, rr.status, rr.sent_at, rr.rating FROM review_requests rr LEFT JOIN customers c ON rr.customer_id = c.id WHERE rr.account_id = $1 ORDER BY rr.sent_at DESC`, [accountId]),
      pool.query(`SELECT c.name AS customer_name, pf.rating, pf.feedback, pf.created_at FROM private_feedback pf LEFT JOIN customers c ON pf.customer_id = c.id WHERE pf.account_id = $1 ORDER BY pf.created_at DESC`, [accountId]),
      pool.query(`SELECT first_name, last_name, email, company_name, created_at FROM users WHERE account_id = $1 AND role = 'owner'`, [accountId]),
    ]);
    const exportData = {
      exported_at: new Date().toISOString(),
      account: userRows.rows[0] || {},
      customers: customerRows.rows,
      review_requests: requestRows.rows,
      private_feedback: feedbackRows.rows,
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="reviewoptic-data-export-${new Date().toISOString().split("T")[0]}.json"`);
    res.json(exportData);
  });

  // Retry a failed payment against the existing card on file
  app.post("/api/billing/retry-payment", requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
      const { rows } = await pool.query(
        `SELECT stripe_subscription_id, payment_failed FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const row = rows[0];
      if (!row?.stripe_subscription_id) return res.status(400).json({ message: "No subscription found" });
      if (!row.payment_failed) return res.status(400).json({ message: "No failed payment to retry" });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Find the latest open invoice for this subscription and attempt to pay it
      const invoices = await stripe.invoices.list({ subscription: row.stripe_subscription_id, limit: 1 }) as any;
      const invoice = invoices.data[0];
      if (!invoice) return res.status(400).json({ message: "No invoice found" });
      if (invoice.status === "paid") return res.json({ ok: true, alreadyPaid: true });

      await stripe.invoices.pay(invoice.id);
      // Payment succeeded — clear suspension (webhook will also fire, but belt-and-braces)
      await pool.query(
        `UPDATE users SET payment_failed = false, payment_failed_at = NULL, payment_failed_count = 0 WHERE id = $1`,
        [req.session.userId]
      );
      res.json({ ok: true });
    } catch (err: any) {
      const msg = err?.raw?.message || err?.message || "Payment retry failed";
      console.error("[billing/retry-payment]", msg);
      // Card declined — return a user-friendly message
      res.status(402).json({ message: msg });
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

    try {

    if (event.type === "invoice.upcoming") {
      const invoice = event.data.object as any;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (subId && customerId) {
        const { rows: userRows } = await pool.query(
          `SELECT email, first_name, plan_type, plan_period FROM users WHERE stripe_subscription_id = $1`,
          [subId]
        );
        if (userRows[0]) {
          const u = userRows[0];
          const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://www.reviewoptic.com");
          const planName = u.plan_type === "pro" ? "Pro Plan" : "Standard Plan";
          const renewalDate = new Date(invoice.period_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
          const amount = `£${(invoice.amount_due / 100).toFixed(2)}`;
          const { sendRenewalReminderEmail } = await import("./email");
          sendRenewalReminderEmail(u.email, u.first_name || "", planName, renewalDate, amount, `${appUrl}/billing`).catch(err =>
            console.error("[stripe-webhook] Failed to send renewal reminder email:", err.message)
          );
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const { rows: userRows } = await pool.query(
          `UPDATE users SET payment_failed = true, payment_failed_at = COALESCE(payment_failed_at, NOW()), payment_failed_count = payment_failed_count + 1
           WHERE stripe_subscription_id = $1 RETURNING email, first_name, payment_failed_count`,
          [subId]
        );
        if (userRows[0]) {
          const u = userRows[0];
          const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://www.reviewoptic.com");
          const { sendPaymentFailedEmail } = await import("./email");
          sendPaymentFailedEmail(u.email, u.first_name || "", `${appUrl}/billing`, u.payment_failed_count).catch(err =>
            console.error("[stripe-webhook] Failed to send payment-failed email:", err.message)
          );
        }
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      // Clear any payment_failed suspension when payment goes through
      const subIdForClear = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subIdForClear) {
        await pool.query(`UPDATE users SET payment_failed = false, payment_failed_at = NULL, payment_failed_count = 0 WHERE stripe_subscription_id = $1`, [subIdForClear]).catch(() => {});
      }
      // Only send confirmation on the very first payment (amount > 0, not a setup invoice)
      if (invoice.amount_paid > 0 && invoice.billing_reason !== "subscription_create") {
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (subId) {
          // Use subscription_confirmation_sent flag to ensure we send exactly once per subscription
          const { rows: userRows } = await pool.query(
            `UPDATE users SET subscription_confirmation_sent = true
             WHERE stripe_subscription_id = $1
               AND (subscription_confirmation_sent IS NULL OR subscription_confirmation_sent = false)
             RETURNING email, first_name, plan_type, plan_period`,
            [subId]
          );
          if (userRows[0]) {
            const u = userRows[0];
            const sub = await stripe.subscriptions.retrieve(subId).catch(() => null) as any;
            const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
            const planName = u.plan_type === "pro" ? "Pro" : "Lite";
            const amountPaid = `£${(invoice.amount_paid / 100).toFixed(2)}`;
            const billingPeriod = u.plan_period === "annual" ? "annual" : "monthly";
            const nextBillingDate = sub?.current_period_end
              ? new Date(sub.current_period_end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
              : "";
            const invoiceUrl = invoice.hosted_invoice_url || "";
            const { sendSubscriptionConfirmationEmail } = await import("./email");
            sendSubscriptionConfirmationEmail(u.email, u.first_name || "", planName, billingPeriod, amountPaid, nextBillingDate, invoiceUrl, `${appUrl}/billing`).catch(err =>
              console.error("[stripe-webhook] Failed to send subscription confirmation email:", err.message)
            );
          }
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subId = event.data.object.id;
      const { rows: userRows } = await pool.query(
        `UPDATE users SET plan_type = 'cancelled', plan_period = 'monthly', cancelled_at = NOW()
         WHERE stripe_subscription_id = $1
         RETURNING email, first_name, email_unsubscribed`,
        [subId]
      );
      // Move them to "former subscribers" in the admin's customer list
      if (userRows[0] && process.env.ADMIN_EMAIL) {
        const adminUser = await storage.getUserByEmail(process.env.ADMIN_EMAIL);
        if (adminUser) {
          const dnc = userRows[0].email_unsubscribed === true;
          await pool.query(
            `UPDATE customers SET status = 'subscriber_cancelled'${dnc ? ", do_not_contact = true" : ""} WHERE account_id = $1 AND email = $2`,
            [adminUser.accountId, userRows[0].email]
          ).catch(() => {});
        }
      }
      // Send "your subscription has now ended" email
      if (userRows[0]) {
        const u = userRows[0];
        const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
        const stripeEndDate = (event.data.object as any).current_period_end;
        const accessEndedDate = stripeEndDate
          ? new Date(stripeEndDate * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
          : undefined;
        const { sendSubscriptionEndedEmail } = await import("./email");
        sendSubscriptionEndedEmail(u.email, u.first_name || "", `${appUrl}/pricing`, accessEndedDate).catch(err =>
          console.error("[stripe-webhook] Failed to send subscription-ended email:", err.message)
        );
      }
    }

    } catch (err: any) {
      console.error("[stripe-webhook] Unhandled error processing event:", event?.type, err?.message);
    }

    res.json({ received: true });
  });

  // Chat history
  // Feedback & feature requests
  app.post("/api/feedback", requireAuth, async (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: "Name, email and message are required" });

    if (!process.env.RESEND_API_KEY) {
      console.log(`[feedback] No RESEND_API_KEY — from=${email} subject=${subject} message=${message}`);
      return res.json({ ok: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Email to ReviewOptic team
    await resend.emails.send({
      from: "ReviewOptic Feedback <noreply@reviewoptic.com>",
      to: "hello@reviewoptic.com",
      replyTo: email,
      subject: `[${subject}] from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
          <h2 style="margin:0 0 16px;">New ${subject}</h2>
          <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
          <p style="white-space:pre-wrap;line-height:1.6;">${message}</p>
        </div>
      `,
    }).catch(err => console.error("[feedback] Failed to send to team:", err.message));

    // Auto-reply to the user
    await resend.emails.send({
      from: "Alicia & Rob - ReviewOptic <hello@reviewoptic.com>",
      to: email,
      subject: "Thanks for your feedback — we've got it!",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
          <div style="margin-bottom:28px;"><a href="https://reviewoptic.com" style="text-decoration:none;"><img src="${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com")}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></a></div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Hi ${name.split(" ")[0]}, thanks for reaching out!</h2>
          <p style="color:#555;margin:0 0 16px;line-height:1.6;">
            We've received your message and really appreciate you taking the time to get in touch. It means a lot to us.
          </p>
          <p style="color:#555;margin:0 0 16px;line-height:1.6;">
            Our team will review your <strong>${subject.toLowerCase()}</strong> carefully. If we have any questions or updates, we'll reply directly to this email.
          </p>
          <p style="color:#555;margin:0 0 16px;line-height:1.6;">
            In the meantime, keep an eye out for updates — your feedback helps shape the product and we take every message seriously.
          </p>
          <p style="color:#555;margin:0;line-height:1.6;">Thanks again,<br /><strong>The ReviewOptic team</strong></p>
          <p style="color:#999;font-size:12px;margin-top:32px;">This is an automated reply to confirm we received your message.</p>
        </div>
      `,
    }).catch(err => console.error("[feedback] Failed to send auto-reply:", err.message));

    res.json({ ok: true });
  });

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
    const { rows: planRows } = await pool.query(`SELECT plan_type FROM users WHERE id = $1`, [req.session.userId]);
    if (planRows[0]?.plan_type === "lite") {
      return res.status(403).json({ message: "Team members are a Pro feature. Upgrade to Pro to invite your team." });
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

  // Unsubscribe: platform emails (ReviewOptic → user)
  app.get("/api/unsubscribe/platform", async (req, res) => {
    const { uid } = req.query;
    if (uid) {
      await pool.query(
        `UPDATE users SET email_unsubscribed = true WHERE id = $1`,
        [uid]
      ).catch(() => {});
    }
    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed — ReviewOptic</title>
      <style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 24px;text-align:center;color:#333;}
      h2{font-size:22px;font-weight:700;margin-bottom:8px;}p{color:#666;font-size:14px;line-height:1.6;}
      a{color:#2563eb;text-decoration:underline;}</style></head>
      <body>
        <h2>You've been unsubscribed</h2>
        <p>You won't receive any more emails from ReviewOptic.</p>
        <p>You can still <a href="/login">log in to your account</a> at any time.</p>
      </body></html>
    `);
  });

  // Unsubscribe: customer emails (business → customer) — sets Do Not Contact
  app.get("/api/unsubscribe/customer", async (req, res) => {
    const { cid } = req.query;
    if (cid) {
      await pool.query(
        `UPDATE customers SET do_not_contact = true WHERE id = $1`,
        [cid]
      ).catch(() => {});
    }
    res.send(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
      <style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 24px;text-align:center;color:#333;}
      h2{font-size:22px;font-weight:700;margin-bottom:8px;}p{color:#666;font-size:14px;line-height:1.6;}</style></head>
      <body>
        <h2>You've been unsubscribed</h2>
        <p>You won't receive any more emails from this business.</p>
        <p>If you believe this was a mistake, please contact the business directly.</p>
      </body></html>
    `);
  });

  // SMS unsubscribe link — public endpoint, no auth needed
  // URL format: /u/TOKEN where TOKEN = first 8 chars of customer UUID
  app.get("/u/:token", async (req, res) => {
    const token = (req.params.token || "").slice(0, 8).toLowerCase();
    if (token.length === 8) {
      await pool.query(
        `UPDATE customers SET do_not_contact = true WHERE id::text LIKE $1 || '%'`,
        [token]
      ).catch(() => {});
    }
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}div{text-align:center;padding:2rem;max-width:400px}h1{color:#111;font-size:1.5rem;margin-bottom:.75rem}p{color:#555;line-height:1.6}</style></head><body><div><h1>You've been unsubscribed</h1><p>You won't receive any more SMS messages from this business. If this was a mistake, please contact them directly.</p></div></body></html>`);
  });

  // Twilio inbound SMS/WhatsApp webhook — handles STOP replies → set customer do_not_contact
  app.post("/api/webhooks/twilio-inbound", express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const body: string = (req.body.Body || "").trim().toUpperCase();
      const from: string = (req.body.From || "").replace(/^whatsapp:/, "").trim();
      const stopWords = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
      if (from && stopWords.includes(body)) {
        // Normalise to E.164 and also try without country code for matching
        const normalised = from.replace(/\s+/g, "");
        const ukLocal = normalised.startsWith("+44") ? "0" + normalised.slice(3) : null;
        const conditions = [normalised, ukLocal].filter(Boolean).map((_, i) => `$${i + 1}`).join(", ");
        const values = [normalised, ukLocal].filter(Boolean);
        await pool.query(
          `UPDATE customers SET do_not_contact = true WHERE REPLACE(phone, ' ', '') = ANY(ARRAY[${conditions}])`,
          values
        ).catch(() => {});
        console.log(`[twilio-inbound] STOP received from ${from} — customer(s) set to Do Not Contact`);
      }
    } catch (err: any) {
      console.error("[twilio-inbound]", err.message);
    }
    // Twilio expects a 200 with TwiML (empty response = no reply sent)
    res.set("Content-Type", "text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
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

  // Admin: get all system email templates (DB overrides merged with defaults)
  app.get("/api/admin/email-templates", requireAdmin, async (_req, res) => {
    const { DEFAULT_EMAIL_TEMPLATES } = await import("./systemEmailTemplates");
    const { rows } = await pool.query(`SELECT type, subject, body FROM system_email_templates`).catch(() => ({ rows: [] as any[] }));
    const overrides: Record<string, { subject: string; body: string }> = {};
    for (const r of rows) overrides[r.type] = { subject: r.subject, body: r.body };
    const result = Object.entries(DEFAULT_EMAIL_TEMPLATES).map(([type, def]) => ({
      type,
      label: def.description,
      subject: overrides[type]?.subject ?? def.subject,
      body: overrides[type]?.body ?? def.body,
      variables: def.variables,
      customised: !!overrides[type],
      adminOnly: def.adminOnly ?? false,
    }));
    res.json(result);
  });

  // Admin: save a custom subject/body for a system email
  app.put("/api/admin/email-templates/:type", requireAdmin, async (req, res) => {
    const { type } = req.params;
    const { subject, body } = req.body as { subject: string; body: string };
    const { DEFAULT_EMAIL_TEMPLATES } = await import("./systemEmailTemplates");
    if (!DEFAULT_EMAIL_TEMPLATES[type]) return res.status(404).json({ message: "Unknown email type" });
    if (!subject?.trim() || !body?.trim()) return res.status(400).json({ message: "Subject and body are required" });
    await pool.query(
      `INSERT INTO system_email_templates (type, subject, body, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (type) DO UPDATE SET subject = $2, body = $3, updated_at = NOW()`,
      [type, subject.trim(), body.trim()]
    );
    res.json({ ok: true });
  });

  // Admin: reset a system email template to its default
  app.delete("/api/admin/email-templates/:type", requireAdmin, async (req, res) => {
    await pool.query(`DELETE FROM system_email_templates WHERE type = $1`, [req.params.type]);
    res.json({ ok: true });
  });

  // Public: fetch system dialog box text for review landing page
  app.get("/api/public/dialog-text", async (_req, res) => {
    const { getEffectiveTemplate } = await import("./systemEmailTemplates");
    const [pos, neg] = await Promise.all([
      getEffectiveTemplate("dialog_positive"),
      getEffectiveTemplate("dialog_negative"),
    ]);
    res.json({
      dialog_positive: { title: pos.subject, body: pos.body },
      dialog_negative: { title: neg.subject, body: neg.body },
    });
  });

  // Admin: test-send any system email to the admin's own email address
  app.post("/api/admin/test-email", requireAdmin, async (req, res) => {
    const { type } = req.body as { type: string };
    if (!type) return res.status(400).json({ message: "Missing type" });
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ message: "RESEND_API_KEY not set" });

    const appUrl = process.env.APP_URL || "https://reviewoptic.com";

    // Get admin email
    const adminRow = await pool.query(`SELECT email, first_name FROM users WHERE id = $1`, [req.session.userId]);
    const adminEmail = adminRow.rows[0]?.email;
    const adminName = adminRow.rows[0]?.first_name || "Alicia";
    if (!adminEmail) return res.status(400).json({ message: "Admin email not found" });

    const {
      sendVerificationEmail, sendTeamInviteEmail, sendRatingNotificationEmail,
      sendCancellationEmail, sendSubscriptionEndedEmail, sendAccountDeletionEmail,
      sendSubscriptionConfirmationEmail, sendPlatformReviewRequest,
    } = await import("./email");

    const dummyCustomer = {
      id: "test-customer-id", name: "Jane Smith", email: adminEmail,
      phone: "+447700000000", serviceType: "boiler service",
      channel: "email", accountId: "test-account-id",
      doNotContact: false, createdAt: new Date(), notes: "", source: "manual",
      lastContactedAt: null, customField1: null, customField2: null,
    } as any;

    const dummySettings = {
      businessName: "Demo Plumbing Co", ownerName: adminName,
      businessEmail: adminEmail, logoUrl: "",
      googleReviewLink: "https://g.page/r/test/review",
      facebookReviewLink: "", trustpilotLink: "", tripadvisorLink: "",
      checkatradeLink: "", mybuilderLink: "", websiteUrl: "https://example.com",
    } as any;

    try {
      switch (type) {
        case "verification":
          await sendVerificationEmail(adminEmail, `${appUrl}/verify-email?token=TEST_TOKEN_EXAMPLE`);
          break;
        case "reset":
          const { Resend: ResendReset } = await import("resend");
          const resendReset = new ResendReset(process.env.RESEND_API_KEY);
          await resendReset.emails.send({
            from: REVIEWOPTIC_FROM, to: adminEmail,
            subject: "[TEST] Reset your ReviewOptic password",
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
              <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:20px">TEST EMAIL — links are not real</div>
              <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
              <p style="color:#555;margin:0 0 24px;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
              <a href="#" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Reset my password</a>
              <p style="color:#999;font-size:12px;margin-top:32px;">If you didn't request this, you can safely ignore this email.</p>
            </div>`,
          });
          break;
        case "team_invite":
          await sendTeamInviteEmail(adminEmail, adminName, "Demo Plumbing Co", `${appUrl}/accept-invite?token=TEST_TOKEN`);
          break;
        case "pre_screen": {
          const { sendPreScreenEmail } = await import("./email");
          await sendPreScreenEmail(dummyCustomer, dummySettings, "test-request-id", appUrl);
          break;
        }
        case "rating_notification":
          await sendRatingNotificationEmail(adminEmail, "Jane Smith", 5, "Demo Plumbing Co", appUrl);
          break;
        case "private_feedback": {
          const resendPF = new Resend(process.env.RESEND_API_KEY);
          const baseUrl = appUrl;
          await resendPF.emails.send({
            from: REVIEWOPTIC_FROM, to: adminEmail,
            subject: "[TEST] Private feedback received from Jane Smith (2★)",
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
              <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:20px">TEST EMAIL</div>
              <div style="margin-bottom:28px;"><img src="${baseUrl}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></div>
              <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;">Private feedback received</h2>
              <p style="color:#555;margin:0 0 16px;line-height:1.6;"><strong>Jane Smith</strong> rated their experience <strong>2 stars</strong> and left the following message:</p>
              <div style="background:#f5f5f5;border-left:4px solid #e5e7eb;padding:12px 16px;border-radius:4px;margin:0 0 24px;">
                <p style="margin:0;font-style:italic;color:#333;">"The service took longer than expected and the engineer left a mess."</p>
              </div>
              <p style="color:#555;margin:0 0 24px;">This feedback is private — only you can see it. Log in to respond.</p>
              <a href="${baseUrl}" style="display:inline-block;background:#0E679D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View &amp; Respond in Dashboard</a>
            </div>`,
          });
          break;
        }
        case "subscription_confirmation":
          await sendSubscriptionConfirmationEmail(
            adminEmail, adminName, "Pro", "monthly", "£49.00",
            new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            "", `${appUrl}/billing`
          );
          break;
        case "cancellation":
          await sendCancellationEmail(
            adminEmail, adminName,
            new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            `${appUrl}/billing`
          );
          break;
        case "subscription_ended":
          await sendSubscriptionEndedEmail(adminEmail, adminName, `${appUrl}/pricing`,
            new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
          break;
        case "account_deletion":
          await sendAccountDeletionEmail(adminEmail, adminName,
            new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            `${appUrl}/pricing`);
          break;
        case "insight": {
          const { runMonthlyInsightEmails } = await import("./insightEmail");
          // Just send directly to admin with dummy stats
          const resendInsight = new Resend(process.env.RESEND_API_KEY);
          await resendInsight.emails.send({
            from: "ReviewOptic <noreply@reviewoptic.com>",
            to: adminEmail,
            subject: "[TEST] Your weekly review report — April 2026",
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
              <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:20px">TEST EMAIL — sample data</div>
              <div style="margin-bottom:28px;"><a href="${appUrl}"><img src="${appUrl}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></a></div>
              <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">Weekly Review Report</h2>
              <p style="color:#888;font-size:13px;margin:0 0 24px;">April 2026 · Demo Plumbing Co</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">New reviews this period</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">12 <span style="font-size:12px;color:#16a34a">+4 vs last period</span></td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">Average star rating</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">4.7 ⭐</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">Review requests sent</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">28</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">Conversion rate</td><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">43%</td></tr>
                <tr><td style="padding:10px 0;color:#555;font-size:14px;">Total reviews (all time)</td><td style="padding:10px 0;text-align:right;font-weight:600;font-size:14px;">84</td></tr>
              </table>
              <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-top:24px;">
                <h3 style="font-size:15px;font-weight:700;margin:0 0 12px;">Your personalised insights</h3>
                <p style="color:#444;font-size:14px;line-height:1.7;margin:0;">1. Great week — 12 new reviews is above your monthly average.<br>2. Your 43% conversion rate is strong. Keep the follow-ups coming.<br>3. Email is your best channel this week — try sending earlier in the day.</p>
              </div>
              <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
                You're receiving weekly review reports as a ReviewOptic subscriber.<br>
                <a href="${appUrl}/settings?tab=notifications" style="color:#999;">Change email frequency</a> · <a href="${appUrl}/api/insight/opt-out?id=test&uid=test" style="color:#999;">Unsubscribe</a>
              </p>
            </div>`,
          });
          break;
        }
        case "platform_review":
          await sendPlatformReviewRequest({ id: req.session.userId!, email: adminEmail, firstName: adminName, companyName: "Demo Plumbing Co" }, false);
          break;
        case "subscriber_review_request": {
          const { sendSubscriberReviewRequestEmail } = await import("./email");
          await sendSubscriberReviewRequestEmail({ id: "test-id", email: adminEmail, name: adminName, companyName: "Demo Plumbing Co" }, "test-request-id", appUrl);
          break;
        }
        default:
          return res.status(400).json({ message: `Unknown email type: ${type}` });
      }
      res.json({ ok: true, sentTo: adminEmail });
    } catch (err: any) {
      console.error("[test-email]", err);
      res.status(500).json({ message: err.message || "Send failed" });
    }
  });

  return httpServer;
}
