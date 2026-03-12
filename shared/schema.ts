import { pgTable, text, integer, boolean, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  serviceDate: text("service_date").notNull().default(""),
  serviceType: text("service_type").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending_request"),
  doNotContact: boolean("do_not_contact").notNull().default(false),
  channel: text("channel").notNull().default("email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewRequests = pgTable("review_requests", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  status: text("status").notNull().default("pending"),
  channel: text("channel").notNull().default("email"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  clickedAt: timestamp("clicked_at"),
  followUpCount: integer("follow_up_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  platform: text("platform").notNull().default("google"),
  stars: integer("stars").notNull().default(5),
  reviewText: text("review_text").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const privateFeedback = pgTable("private_feedback", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  stars: integer("stars").notNull().default(1),
  message: text("message").notNull().default(""),
  responded: boolean("responded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull(),
  customerId: varchar("customer_id"),
  customerName: text("customer_name").notNull().default(""),
  message: text("message").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(),
  channel: text("channel").notNull().default("email"),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default("default"),
  ownerName: text("owner_name").notNull().default(""),
  businessName: text("business_name").notNull().default("My Business"),
  businessEmail: text("business_email").notNull().default(""),
  googleReviewLink: text("google_review_link").notNull().default(""),
  facebookReviewLink: text("facebook_review_link").notNull().default(""),
  defaultChannel: text("default_channel").notNull().default("email"),
  followUpEnabled: boolean("follow_up_enabled").notNull().default(true),
  followUp1Days: integer("follow_up_1_days").notNull().default(3),
  followUp2Days: integer("follow_up_2_days").notNull().default(7),
  maxFollowUps: integer("max_follow_ups").notNull().default(2),
  widgetMinStars: integer("widget_min_stars").notNull().default(4),
  widgetCount: integer("widget_count").notNull().default(5),
  widgetLayout: text("widget_layout").notNull().default("grid"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ createdAt: true });
export const insertReviewRequestSchema = createInsertSchema(reviewRequests).omit({ createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ createdAt: true });
export const insertPrivateFeedbackSchema = createInsertSchema(privateFeedback).omit({ createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ createdAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ updatedAt: true });
export const insertSettingsSchema = createInsertSchema(settings);

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
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
