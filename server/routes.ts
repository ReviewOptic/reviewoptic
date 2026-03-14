import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import type { Review, Customer, Settings } from "@shared/schema";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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
  // Customers
  app.get("/api/customers", async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });
  app.get("/api/customers/:id", async (req, res) => {
    const c = await storage.getCustomer(req.params.id);
    if (!c) return res.status(404).json({ message: "Customer not found" });
    res.json(c);
  });
  app.post("/api/customers", async (req, res) => {
    if (!req.body.name) return res.status(400).json({ message: "Name is required" });
    if (!req.body.email && !req.body.phone) return res.status(400).json({ message: "Email or phone number is required" });
    const c = await storage.createCustomer(req.body);
    await storage.createActivity({
      id: randomUUID(),
      type: "customer_added",
      customerId: c.id,
      customerName: c.name,
      message: `${c.name} added as a customer`,
      metadata: "{}",
    });
    res.json(c);
  });
  app.patch("/api/customers/:id", async (req, res) => {
    const c = await storage.updateCustomer(req.params.id, req.body);
    if (!c) return res.status(404).json({ message: "Customer not found" });
    res.json(c);
  });
  app.delete("/api/customers/:id", async (req, res) => {
    await storage.deleteCustomer(req.params.id);
    res.json({ success: true });
  });

  // Review Requests
  app.get("/api/review-requests", async (req, res) => {
    const rr = await storage.getReviewRequests();
    res.json(rr);
  });
  app.post("/api/review-requests", async (req, res) => {
    const customer = await storage.getCustomer(req.body.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const rr = await storage.createReviewRequest({
      ...req.body,
      status: "sent",
      sentAt: new Date(),
    });
    await storage.updateCustomer(customer.id, { status: "request_sent" });
    await storage.createActivity({
      id: randomUUID(),
      type: "request_sent",
      customerId: customer.id,
      customerName: customer.name,
      message: `Review request sent to ${customer.name} via ${req.body.channel || customer.channel}`,
      metadata: "{}",
    });
    res.json(rr);
  });
  app.patch("/api/review-requests/:id", async (req, res) => {
    const rr = await storage.updateReviewRequest(req.params.id, req.body);
    if (!rr) return res.status(404).json({ message: "Not found" });
    res.json(rr);
  });
  // Track link click
  app.get("/api/track/:requestId/click", async (req, res) => {
    const rr = await storage.updateReviewRequest(req.params.requestId, {
      clickedAt: new Date(),
      status: "clicked",
    });
    if (rr) {
      const customer = await storage.getCustomer(rr.customerId);
      if (customer) {
        await storage.updateCustomer(customer.id, { status: "clicked" });
        await storage.createActivity({
          id: randomUUID(),
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

  // Reviews
  app.get("/api/reviews", async (req, res) => {
    res.json(await storage.getReviews());
  });
  app.post("/api/reviews", async (req, res) => {
    const review = await storage.createReview(req.body);
    const customer = await storage.getCustomer(req.body.customerId);
    if (customer) {
      await storage.updateCustomer(customer.id, { status: "review_completed" });
      await storage.createActivity({
        id: randomUUID(),
        type: "review_received",
        customerId: customer.id,
        customerName: customer.name,
        message: `${customer.name} left a ${req.body.stars}-star review on ${req.body.platform}`,
        metadata: JSON.stringify({ stars: req.body.stars, platform: req.body.platform }),
      });
      // Auto-post to social if review is 4 or 5 stars
      if (review.stars >= 4) {
        const settings = await storage.getSettings();
        if (settings) {
          postReviewToSocial(review, customer, settings).catch(err =>
            console.error("Social post failed:", err)
          );
        }
      }
    }
    res.json(review);
  });

  // Private Feedback
  app.get("/api/private-feedback", async (req, res) => {
    res.json(await storage.getPrivateFeedback());
  });
  app.post("/api/private-feedback", async (req, res) => {
    const feedback = await storage.createPrivateFeedback(req.body);
    const customer = await storage.getCustomer(req.body.customerId);
    if (customer) {
      await storage.createActivity({
        id: randomUUID(),
        type: "private_feedback",
        customerId: customer.id,
        customerName: customer.name,
        message: `${customer.name} left private feedback (${req.body.stars} star${req.body.stars !== 1 ? "s" : ""})`,
        metadata: JSON.stringify({ stars: req.body.stars }),
      });
    }
    res.json(feedback);
  });
  app.patch("/api/private-feedback/:id", async (req, res) => {
    const f = await storage.updatePrivateFeedback(req.params.id, req.body);
    if (!f) return res.status(404).json({ message: "Not found" });
    res.json(f);
  });

  // Activity Log
  app.get("/api/activity", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    res.json(await storage.getActivityLog(limit));
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    res.json(await storage.getTemplates());
  });
  app.post("/api/templates", async (req, res) => {
    const t = await storage.createTemplate(req.body);
    res.json(t);
  });
  app.patch("/api/templates/:id", async (req, res) => {
    const t = await storage.updateTemplate(req.params.id, req.body);
    if (!t) return res.status(404).json({ message: "Not found" });
    res.json(t);
  });
  app.post("/api/templates/upload-video", videoUpload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No video uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
  app.post("/api/templates/upload-audio", audioUpload.single("audio"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No audio uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    const s = await storage.getSettings();
    res.json(s || {});
  });
  app.patch("/api/settings", async (req, res) => {
    try {
      console.log("PATCH /api/settings body:", JSON.stringify(req.body));
      const s = await storage.upsertSettings(req.body);
      console.log("PATCH /api/settings result:", JSON.stringify(s));
      res.json(s);
    } catch (err) {
      console.error("Failed to save settings:", err);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Stats
  app.get("/api/stats", async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Analytics data
  app.get("/api/analytics", async (req, res) => {
    const days = parseInt((req.query.days as string) || "30");
    const [allRequests, allReviews] = await Promise.all([
      storage.getReviewRequests(),
      storage.getReviews(),
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
    const completed = recentRequests.filter(r => r.status === "completed" || r.status === "clicked").length;
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

  // Widget embed API (public)
  app.get("/api/widget/:businessId/reviews", async (req, res) => {
    const settings = await storage.getSettings();
    const minStars = settings?.widgetMinStars || 4;
    const count = settings?.widgetCount || 5;
    const allReviews = await storage.getReviews();
    const filtered = allReviews.filter(r => r.stars >= minStars).slice(0, count);
    const customers = await Promise.all(filtered.map(r => storage.getCustomer(r.customerId)));
    const result = filtered.map((r, i) => ({
      ...r,
      customerName: customers[i]?.name || "Anonymous",
    }));
    res.json({ reviews: result, businessName: settings?.businessName || "My Business" });
  });

  // Facebook OAuth
  let oauthState = "";

  app.get("/auth/facebook", async (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return res.status(400).send("Facebook App ID not configured on the server.");
    oauthState = randomUUID();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: "http://localhost:5000/auth/facebook/callback",
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
    try {
      const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: "http://localhost:5000/auth/facebook/callback",
          code,
        }),
      });
      const tokenData = await tokenRes.json() as { access_token: string };
      const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
      const pagesData = await pagesRes.json() as { data: Array<{ access_token: string; id: string }> };
      if (!pagesData.data?.length) return res.status(400).send("No Facebook Pages found on this account.");
      const page = pagesData.data[0];
      await storage.upsertSettings({ facebookPageAccessToken: page.access_token, facebookPageId: page.id });
      res.redirect("http://localhost:5000/?tab=settings&connected=facebook");
    } catch (err) {
      console.error("Facebook OAuth error:", err);
      res.status(500).send("Facebook OAuth failed. Check server logs.");
    }
  });

  app.delete("/api/social/facebook", async (req, res) => {
    await storage.upsertSettings({ facebookPageAccessToken: "", facebookPageId: "" });
    res.json({ success: true });
  });

  // LinkedIn OAuth
  app.get("/auth/linkedin", async (req, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) return res.status(400).send("LinkedIn Client ID not configured on the server.");
    oauthState = randomUUID();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "http://localhost:5000/auth/linkedin/callback",
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
    try {
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: "http://localhost:5000/auth/linkedin/callback",
        }),
      });
      const tokenData = await tokenRes.json() as { access_token: string };
      const orgsRes = await fetch("https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const orgsData = await orgsRes.json() as { elements: Array<{ organization: string }> };
      let orgId = "";
      if (orgsData.elements?.length) {
        // URN format: "urn:li:organization:12345"
        const urn = orgsData.elements[0].organization;
        orgId = urn.split(":").pop() || "";
      }
      await storage.upsertSettings({ linkedinAccessToken: tokenData.access_token, linkedinOrganizationId: orgId });
      res.redirect("http://localhost:5000/?tab=settings&connected=linkedin");
    } catch (err) {
      console.error("LinkedIn OAuth error:", err);
      res.status(500).send("LinkedIn OAuth failed. Check server logs.");
    }
  });

  app.delete("/api/social/linkedin", async (req, res) => {
    await storage.upsertSettings({ linkedinAccessToken: "", linkedinOrganizationId: "" });
    res.json({ success: true });
  });

  return httpServer;
}
