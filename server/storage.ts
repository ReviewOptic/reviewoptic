import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import pkg from "pg";
const { Pool } = pkg;
import { randomUUID } from "crypto";
import { sendReviewEmail } from "./email";
import {
  accounts, customers, reviewRequests, reviews, privateFeedback, activityLog, templates, settings, users, passwordResetTokens,
  type Account,
  type Customer, type InsertCustomer,
  type ReviewRequest, type InsertReviewRequest,
  type Review, type InsertReview,
  type PrivateFeedback, type InsertPrivateFeedback,
  type ActivityLog, type InsertActivityLog,
  type Template, type InsertTemplate,
  type Settings, type InsertSettings,
  type User, type InsertUser,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // Accounts
  createAccount(): Promise<Account>;
  // Customers
  getCustomers(accountId: string): Promise<Customer[]>;
  getCustomer(id: string, accountId: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>, accountId: string): Promise<Customer | undefined>;
  deleteCustomer(id: string, accountId: string): Promise<void>;
  // Review Requests
  getReviewRequests(accountId: string): Promise<ReviewRequest[]>;
  getReviewRequest(id: string): Promise<ReviewRequest | undefined>;
  getReviewRequestByCustomer(customerId: string): Promise<ReviewRequest | undefined>;
  createReviewRequest(data: InsertReviewRequest): Promise<ReviewRequest>;
  updateReviewRequest(id: string, data: Partial<InsertReviewRequest>): Promise<ReviewRequest | undefined>;
  // Reviews
  getReviews(accountId: string): Promise<Review[]>;
  createReview(data: InsertReview): Promise<Review>;
  // Private Feedback
  getPrivateFeedback(accountId: string): Promise<PrivateFeedback[]>;
  createPrivateFeedback(data: InsertPrivateFeedback): Promise<PrivateFeedback>;
  updatePrivateFeedback(id: string, data: Partial<InsertPrivateFeedback>): Promise<PrivateFeedback | undefined>;
  // Activity Log
  getActivityLog(accountId: string, limit?: number): Promise<ActivityLog[]>;
  createActivity(data: InsertActivityLog): Promise<ActivityLog>;
  // Templates
  getTemplates(accountId: string): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(data: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template | undefined>;
  // Settings
  getSettings(accountId: string): Promise<Settings | undefined>;
  upsertSettings(accountId: string, data: Partial<InsertSettings>): Promise<Settings>;
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  verifyUserEmail(token: string): Promise<User | undefined>;
  // Password reset tokens
  createResetToken(userId: string): Promise<string>;
  getResetToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
  deleteResetToken(token: string): Promise<void>;
  // Stats
  getStats(accountId: string): Promise<{
    requestsThisMonth: number;
    pendingRequests: number;
    reviewsThisMonth: number;
    responseRate: number;
    avgRating: number;
  }>;
  markNoResponse(): Promise<number>;
  sendFollowUps(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async createAccount(): Promise<Account> {
    const id = randomUUID();
    const [a] = await db.insert(accounts).values({ id }).returning();
    return a;
  }

  async getCustomers(accountId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.accountId, accountId)).orderBy(desc(customers.createdAt));
  }
  async getCustomer(id: string, accountId: string): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.accountId, accountId)));
    return c;
  }
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const [c] = await db.insert(customers).values({ ...data, id }).returning();
    return c;
  }
  async updateCustomer(id: string, data: Partial<InsertCustomer>, accountId: string): Promise<Customer | undefined> {
    const [c] = await db.update(customers).set(data).where(and(eq(customers.id, id), eq(customers.accountId, accountId))).returning();
    return c;
  }
  async deleteCustomer(id: string, accountId: string): Promise<void> {
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.accountId, accountId)));
  }

  async getReviewRequests(accountId: string): Promise<ReviewRequest[]> {
    return db.select().from(reviewRequests).where(eq(reviewRequests.accountId, accountId)).orderBy(desc(reviewRequests.createdAt));
  }
  async getReviewRequest(id: string): Promise<ReviewRequest | undefined> {
    const [r] = await db.select().from(reviewRequests).where(eq(reviewRequests.id, id));
    return r;
  }
  async getReviewRequestByCustomer(customerId: string): Promise<ReviewRequest | undefined> {
    const [r] = await db.select().from(reviewRequests).where(eq(reviewRequests.customerId, customerId)).orderBy(desc(reviewRequests.createdAt));
    return r;
  }
  async createReviewRequest(data: InsertReviewRequest): Promise<ReviewRequest> {
    const id = randomUUID();
    const [r] = await db.insert(reviewRequests).values({ ...data, id }).returning();
    return r;
  }
  async updateReviewRequest(id: string, data: Partial<InsertReviewRequest>): Promise<ReviewRequest | undefined> {
    const [r] = await db.update(reviewRequests).set(data).where(eq(reviewRequests.id, id)).returning();
    return r;
  }

  async getReviews(accountId: string): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.accountId, accountId)).orderBy(desc(reviews.createdAt));
  }
  async createReview(data: InsertReview): Promise<Review> {
    const id = randomUUID();
    const [r] = await db.insert(reviews).values({ ...data, id }).returning();
    return r;
  }

  async getPrivateFeedback(accountId: string): Promise<PrivateFeedback[]> {
    return db.select().from(privateFeedback).where(eq(privateFeedback.accountId, accountId)).orderBy(desc(privateFeedback.createdAt));
  }
  async createPrivateFeedback(data: InsertPrivateFeedback): Promise<PrivateFeedback> {
    const id = randomUUID();
    const [f] = await db.insert(privateFeedback).values({ ...data, id }).returning();
    return f;
  }
  async updatePrivateFeedback(id: string, data: Partial<InsertPrivateFeedback>): Promise<PrivateFeedback | undefined> {
    const [f] = await db.update(privateFeedback).set(data).where(eq(privateFeedback.id, id)).returning();
    return f;
  }

  async getActivityLog(accountId: string, limit = 20): Promise<ActivityLog[]> {
    return db.select().from(activityLog).where(eq(activityLog.accountId, accountId)).orderBy(desc(activityLog.createdAt)).limit(limit);
  }
  async createActivity(data: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const [a] = await db.insert(activityLog).values({ ...data, id }).returning();
    return a;
  }

  async getTemplates(accountId: string): Promise<Template[]> {
    return db.select().from(templates).where(eq(templates.accountId, accountId)).orderBy(templates.name);
  }
  async getTemplate(id: string): Promise<Template | undefined> {
    const [t] = await db.select().from(templates).where(eq(templates.id, id));
    return t;
  }
  async createTemplate(data: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const [t] = await db.insert(templates).values({ ...data, id }).returning();
    return t;
  }
  async updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [t] = await db.update(templates).set({ ...data, updatedAt: new Date() }).where(eq(templates.id, id)).returning();
    return t;
  }

  async getSettings(accountId: string): Promise<Settings | undefined> {
    const [s] = await db.select().from(settings).where(eq(settings.accountId, accountId));
    return s;
  }
  async upsertSettings(accountId: string, data: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings(accountId);
    if (existing) {
      const [updated] = await db.update(settings).set(data).where(eq(settings.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(settings).values({ id: randomUUID(), accountId, ...data }).returning();
    return inserted;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return u;
  }
  async createUser(data: InsertUser): Promise<User> {
    const id = randomUUID();
    const [u] = await db.insert(users).values({ ...data, id }).returning();
    return u;
  }
  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }
  async verifyUserEmail(token: string): Promise<User | undefined> {
    const [u] = await db
      .update(users)
      .set({ emailVerified: true, verificationToken: null })
      .where(and(eq(users.verificationToken, token), eq(users.emailVerified, false)))
      .returning();
    return u;
  }
  async createResetToken(userId: string): Promise<string> {
    // Remove any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.insert(passwordResetTokens).values({ token, userId, expiresAt });
    return token;
  }
  async getResetToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined> {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!row) return undefined;
    return { userId: row.userId, expiresAt: row.expiresAt };
  }
  async deleteResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  async getStats(accountId: string): Promise<{
    requestsThisMonth: number;
    pendingRequests: number;
    reviewsThisMonth: number;
    responseRate: number;
    avgRating: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const allCustomers = await db.select().from(customers).where(eq(customers.accountId, accountId));
    const requestsThisMonth = allCustomers.filter(c => c.createdAt >= monthStart && c.status !== "pending_request").length;
    const pendingRequests = allCustomers.filter(c => c.status === "request_sent" && !c.doNotContact).length;
    const allReviews = await db.select().from(reviews).where(eq(reviews.accountId, accountId));
    const reviewsThisMonth = allReviews.filter(r => r.createdAt >= monthStart).length;
    const sent = allCustomers.filter(c => c.status !== "pending_request").length;
    const reviewed = allCustomers.filter(c => c.status === "review_completed").length;
    const responseRate = sent > 0 ? Math.round((reviewed / sent) * 100) : 0;
    const avgRating = allReviews.length > 0
      ? Math.round((allReviews.reduce((s, r) => s + r.stars, 0) / allReviews.length) * 10) / 10
      : 0;
    return { requestsThisMonth, pendingRequests, reviewsThisMonth, responseRate, avgRating };
  }

  async markNoResponse(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const stale = await db
      .select({ customerId: reviewRequests.customerId })
      .from(reviewRequests)
      .where(and(eq(customers.status, "request_sent"), sql`${reviewRequests.sentAt} < ${cutoff}`))
      .innerJoin(customers, eq(reviewRequests.customerId, customers.id))
      .groupBy(reviewRequests.customerId)
      .having(sql`min(${reviewRequests.sentAt}) < ${cutoff}`);
    if (stale.length === 0) return 0;
    const ids = stale.map(r => r.customerId);
    const result = await db
      .update(customers)
      .set({ status: "no_response" })
      .where(and(inArray(customers.id, ids), eq(customers.status, "request_sent")))
      .returning();
    return result.length;
  }

  async sendFollowUps(): Promise<number> {
    // Get all unique accountIds that have active customers
    const activeCustomers = await db.select().from(customers).where(
      and(eq(customers.status, "request_sent"), eq(customers.doNotContact, false))
    );
    if (activeCustomers.length === 0) return 0;

    // Get unique accountIds
    const accountIds = Array.from(new Set(activeCustomers.map(c => c.accountId)));
    let totalSent = 0;
    const now = new Date();

    for (const accountId of accountIds) {
      const s = await this.getSettings(accountId);
      if (!s?.followUpEnabled) continue;

      const followUp1Days = s.followUp1Days ?? 3;
      const followUp2Days = s.followUp2Days ?? 7;
      const maxFollowUps = s.maxFollowUps ?? 2;
      const cutoff1 = new Date(now.getTime() - followUp1Days * 24 * 60 * 60 * 1000);
      const cutoff2 = new Date(now.getTime() - followUp2Days * 24 * 60 * 60 * 1000);

      const eligible = activeCustomers.filter(c => c.accountId === accountId);

      for (const customer of eligible) {
        const requests = await db.select().from(reviewRequests)
          .where(and(eq(reviewRequests.customerId, customer.id), sql`${reviewRequests.sentAt} IS NOT NULL`))
          .orderBy(reviewRequests.sentAt);

        const sentCount = requests.length;
        const firstSentAt = requests[0]?.sentAt;
        if (!firstSentAt || sentCount > maxFollowUps) continue;

        const shouldSendNext =
          (sentCount === 1 && firstSentAt <= cutoff1) ||
          (sentCount === 2 && maxFollowUps >= 2 && firstSentAt <= cutoff2);

        if (shouldSendNext) {
          await db.insert(reviewRequests).values({
            id: randomUUID(),
            accountId: customer.accountId,
            customerId: customer.id,
            status: "sent",
            channel: customer.channel,
            sentAt: now,
            followUpCount: sentCount,
          });
          await this.createActivity({
            id: randomUUID(),
            accountId: customer.accountId,
            type: "request_sent",
            customerId: customer.id,
            customerName: customer.name,
            message: `Follow-up #${sentCount + 1} sent automatically to ${customer.name} via ${customer.channel}`,
            metadata: "{}",
          });

          // Send follow-up email
          if (customer.channel === "email" && customer.email) {
            const allTemplates = await this.getTemplates(customer.accountId);
            const template =
              allTemplates.find(t => t.channel === "email" && t.isDefault) ||
              allTemplates.find(t => t.channel === "email") ||
              null;
            sendReviewEmail(customer, s, template).catch(err =>
              console.error(`[follow-up] Failed to send email to ${customer.email}:`, err.message)
            );
          }

          totalSent++;
        }
      }
    }
    return totalSent;
  }
}

export const storage = new DatabaseStorage();
