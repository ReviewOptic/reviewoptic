import { pgTable, text, integer, boolean, timestamp, varchar, real, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  serviceDate: text("service_date").notNull().default(""),
  serviceType: text("service_type").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending_request"),
  doNotContact: boolean("do_not_contact").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  namePronunciation: text("name_pronunciation").notNull().default(""),
  channel: text("channel").notNull().default("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const reviewRequests = pgTable("review_requests", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  customerId: varchar("customer_id").notNull(),
  status: text("status").notNull().default("pending"),
  channel: text("channel").notNull().default("email"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  clickedAt: timestamp("clicked_at"),
  followUpCount: integer("follow_up_count").notNull().default(0),
  rating: integer("rating"),
  openedAt: timestamp("opened_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  customerId: varchar("customer_id").notNull(),
  platform: text("platform").notNull().default("google"),
  stars: integer("stars").notNull().default(5),
  reviewText: text("review_text").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const privateFeedback = pgTable("private_feedback", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  customerId: varchar("customer_id").notNull(),
  reviewRequestId: varchar("review_request_id").notNull().default(""),
  stars: integer("stars").notNull().default(1),
  message: text("message").notNull().default(""),
  responded: boolean("responded").notNull().default(false),
  response: text("response").notNull().default(""),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  type: text("type").notNull(),
  customerId: varchar("customer_id"),
  customerName: text("customer_name").notNull().default(""),
  message: text("message").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(),
  channel: text("channel").notNull().default("email"),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  videoUrl: text("video_url").notNull().default(""),
  audioUrl: text("audio_url").notNull().default(""),
  preferredPlatform: text("preferred_platform").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  ownerName: text("owner_name").notNull().default(""),
  businessName: text("business_name").notNull().default("My Business"),
  businessEmail: text("business_email").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  logoPosition: text("logo_position").notNull().default("left"),
  websiteUrl: text("website_url").notNull().default(""),
  googleReviewLink: text("google_review_link").notNull().default(""),
  facebookReviewLink: text("facebook_review_link").notNull().default(""),
  trustpilotLink: text("trustpilot_link").notNull().default(""),
  tripadvisorLink: text("tripadvisor_link").notNull().default(""),
  checkatradeLink: text("checkatrade_link").notNull().default(""),
  mybuilderLink: text("mybuilder_link").notNull().default(""),
  yellLink: text("yell_link").notNull().default(""),
  defaultChannel: text("default_channel").notNull().default("email"),
  followUpEnabled: boolean("follow_up_enabled").notNull().default(true),
  followUp1Days: integer("follow_up_1_days").notNull().default(3),
  followUp2Days: integer("follow_up_2_days").notNull().default(7),
  followUp3Days: integer("follow_up_3_days").notNull().default(14),
  maxFollowUps: integer("max_follow_ups").notNull().default(2),
  widgetMinStars: integer("widget_min_stars").notNull().default(4),
  widgetCount: integer("widget_count").notNull().default(5),
  widgetLayout: text("widget_layout").notNull().default("grid"),
  facebookAppId: text("facebook_app_id").notNull().default(""),
  facebookAppSecret: text("facebook_app_secret").notNull().default(""),
  linkedinClientId: text("linkedin_client_id").notNull().default(""),
  linkedinClientSecret: text("linkedin_client_secret").notNull().default(""),
  facebookPageAccessToken: text("facebook_page_access_token").notNull().default(""),
  facebookPageId: text("facebook_page_id").notNull().default(""),
  facebookPageName: text("facebook_page_name").notNull().default(""),
  linkedinAccessToken: text("linkedin_access_token").notNull().default(""),
  linkedinOrganizationId: text("linkedin_organization_id").notNull().default(""),
  instagramBusinessAccountId: text("instagram_business_account_id").notNull().default(""),
  instagramUsername: text("instagram_username").notNull().default(""),
  instagramProfilePicUrl: text("instagram_profile_pic_url").notNull().default(""),
  socialPostEnabled: boolean("social_post_enabled").notNull().default(false),
  socialPostMessage: text("social_post_message").notNull().default("⭐ We just received a {stars}★ review! Thank you {customer_name}!"),
  socialCardTemplate: text("social_card_template").notNull().default("classic"),
  country: text("country").notNull().default(""),
  defaultSendTime: text("default_send_time").notNull().default(""),
  voiceNoteUrl: text("voice_note_url").notNull().default(""),
  videoMessageUrl: text("video_message_url").notNull().default(""),
  elevenLabsVoiceId: text("elevenlabs_voice_id").notNull().default(""),
  notifyRatings: boolean("notify_ratings").notNull().default(true),
  businessType: text("business_type").notNull().default(""),
  fontFamily: text("font_family").notNull().default("Inter"),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = Partial<Settings>;

export const externalReviews = pgTable("external_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: varchar("account_id").notNull(),
  platform: text("platform").notNull(),
  externalId: text("external_id").notNull().default(""),
  authorName: text("author_name").notNull().default(""),
  rating: integer("rating").notNull(),
  reviewText: text("review_text").notNull().default(""),
  reviewDate: timestamp("review_date"),
  postedToSocial: boolean("posted_to_social").notNull().default(false),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("external_reviews_account_idx").on(table.accountId),
  uniqueIndex("external_reviews_dedup_idx").on(table.accountId, table.platform, table.externalId),
]);

export const insertCustomerSchema = createInsertSchema(customers).omit({ createdAt: true });
export const insertReviewRequestSchema = createInsertSchema(reviewRequests).omit({ createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ createdAt: true });
export const insertPrivateFeedbackSchema = createInsertSchema(privateFeedback).omit({ createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ createdAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ updatedAt: true });

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type InsertReviewRequest = z.infer<typeof insertReviewRequestSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type PrivateFeedback = typeof privateFeedback.$inferSelect;
export type InsertPrivateFeedback = z.infer<typeof insertPrivateFeedbackSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Account = typeof accounts.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull().default(""),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  isAdmin: boolean("is_admin").notNull().default(false),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  companyName: text("company_name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const passwordResetTokens = pgTable("password_reset_tokens", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminImpersonationLog = pgTable("admin_impersonation_log", {
  id: varchar("id").primaryKey(),
  adminId: varchar("admin_id").notNull(),
  adminEmail: text("admin_email").notNull(),
  targetUserId: varchar("target_user_id").notNull(),
  targetEmail: text("target_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insightEmailLog = pgTable("insight_email_log", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  email: text("email").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: timestamp("opened_at"),
});

export const recordings = pgTable("recordings", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull(),
  type: text("type").notNull(),
  label: text("label").notNull().default(""),
  url: text("url").notNull(),
  elevenLabsVoiceId: text("elevenlabs_voice_id").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewPlatformClicks = pgTable("review_platform_clicks", {
  id: varchar("id").primaryKey(),
  requestId: varchar("request_id").notNull(),
  accountId: varchar("account_id").notNull(),
  platform: text("platform").notNull(),
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("account_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  link: text("link").notNull().default("/customers"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("account_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const systemEmailTemplates = pgTable("system_email_templates", {
  type: text("type").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey(),
  metaPixelId: text("meta_pixel_id").notNull().default(""),
  googleTagId: text("google_tag_id").notNull().default(""),
  tiktokPixelId: text("tiktok_pixel_id").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AdminImpersonationLog = typeof adminImpersonationLog.$inferSelect;
