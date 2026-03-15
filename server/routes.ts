import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import type { Review, Customer, Settings } from "@shared/schema";

function getMailTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendResetEmail(to: string, resetUrl: string) {
  const transport = getMailTransport();
  if (!transport) {
    console.log(`[password reset] No SMTP configured. Reset link for ${to}: ${resetUrl}`);
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your ReviewOptic password",
    html: `
      <p>Hi,</p>
      <p>You requested a password reset for your ReviewOptic account.</p>
      <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">Reset my password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
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
    const { email, password, businessName } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(400).json({ message: "An account with this email already exists" });

    const account = await storage.createAccount();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      accountId: account.id,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Create default settings for the new account
    await storage.upsertSettings(account.id, {
      businessName: businessName || "My Business",
    });

    req.session.userId = user.id;
    req.session.accountId = account.id;
    res.json({ id: user.id, email: user.email, accountId: account.id });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    req.session.userId = user.id;
    req.session.accountId = user.accountId;
    res.json({ id: user.id, email: user.email, accountId: user.accountId });
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
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
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
    res.json({ id: user.id, email: user.email, accountId: user.accountId });
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
  app.post("/api/review-requests", requireAuth, async (req, res) => {
    const customer = await storage.getCustomer(req.body.customerId, req.session.accountId!);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const rr = await storage.createReviewRequest({
      ...req.body,
      accountId: req.session.accountId,
      status: "sent",
      sentAt: new Date(),
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
    res.json(rr);
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

  // Settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    const s = await storage.getSettings(req.session.accountId!);
    res.json(s || {});
  });
  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const s = await storage.upsertSettings(req.session.accountId!, req.body);
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
    const days = parseInt((req.query.days as string) || "30");
    const accountId = req.session.accountId!;
    const [allRequests, allReviews] = await Promise.all([
      storage.getReviewRequests(accountId),
      storage.getReviews(accountId),
    ]);
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const dailyData: Record<string, { date: string; requests: number; reviews: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(cutoff.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { date: key, requests: 0, reviews: 0 };
    }
    allRequests.filter(r => r.createdAt >= cutoff).forEach(r => {
      const key = r.createdAt.toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].requests++;
    });
    allReviews.filter(r => r.createdAt >= cutoff).forEach(r => {
      const key = r.createdAt.toISOString().split("T")[0];
      if (dailyData[key]) dailyData[key].reviews++;
    });
    const recentRequests = allRequests.filter(r => r.createdAt >= cutoff);
    const clicked = recentRequests.filter(r => r.clickedAt).length;
    const channelBreakdown = { email: 0, sms: 0, whatsapp: 0 };
    allRequests.forEach(r => {
      const ch = r.channel as keyof typeof channelBreakdown;
      if (channelBreakdown[ch] !== undefined) channelBreakdown[ch]++;
    });
    res.json({
      daily: Object.values(dailyData),
      funnel: {
        sent: recentRequests.length,
        clicked,
        completed: allReviews.filter(r => r.createdAt >= cutoff).length,
      },
      channelBreakdown,
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
