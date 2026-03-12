import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, count, sql } from "drizzle-orm";
import pkg from "pg";
const { Pool } = pkg;
import { randomUUID } from "crypto";
import {
  customers, reviewRequests, reviews, privateFeedback, activityLog, templates, settings, users,
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
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;
  // Review Requests
  getReviewRequests(): Promise<ReviewRequest[]>;
  getReviewRequest(id: string): Promise<ReviewRequest | undefined>;
  getReviewRequestByCustomer(customerId: string): Promise<ReviewRequest | undefined>;
  createReviewRequest(data: InsertReviewRequest): Promise<ReviewRequest>;
  updateReviewRequest(id: string, data: Partial<InsertReviewRequest>): Promise<ReviewRequest | undefined>;
  // Reviews
  getReviews(): Promise<Review[]>;
  createReview(data: InsertReview): Promise<Review>;
  // Private Feedback
  getPrivateFeedback(): Promise<PrivateFeedback[]>;
  createPrivateFeedback(data: InsertPrivateFeedback): Promise<PrivateFeedback>;
  updatePrivateFeedback(id: string, data: Partial<InsertPrivateFeedback>): Promise<PrivateFeedback | undefined>;
  // Activity Log
  getActivityLog(limit?: number): Promise<ActivityLog[]>;
  createActivity(data: InsertActivityLog): Promise<ActivityLog>;
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(data: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template | undefined>;
  // Settings
  getSettings(): Promise<Settings | undefined>;
  upsertSettings(data: Partial<InsertSettings>): Promise<Settings>;
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Stats
  getStats(): Promise<{
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
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.id, id));
    return c;
  }
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const [c] = await db.insert(customers).values({ ...data, id }).returning();
    return c;
  }
  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [c] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return c;
  }
  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }
  async getReviewRequests(): Promise<ReviewRequest[]> {
    return db.select().from(reviewRequests).orderBy(desc(reviewRequests.createdAt));
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
  async getReviews(): Promise<Review[]> {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }
  async createReview(data: InsertReview): Promise<Review> {
    const id = randomUUID();
    const [r] = await db.insert(reviews).values({ ...data, id }).returning();
    return r;
  }
  async getPrivateFeedback(): Promise<PrivateFeedback[]> {
    return db.select().from(privateFeedback).orderBy(desc(privateFeedback.createdAt));
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
  async getActivityLog(limit = 20): Promise<ActivityLog[]> {
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
  }
  async createActivity(data: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const [a] = await db.insert(activityLog).values({ ...data, id }).returning();
    return a;
  }
  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates).orderBy(templates.name);
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
  async getSettings(): Promise<Settings | undefined> {
    const [s] = await db.select().from(settings).where(eq(settings.id, "default"));
    return s;
  }
  async upsertSettings(data: Partial<InsertSettings>): Promise<Settings> {
    const [updated] = await db.update(settings).set(data).where(eq(settings.id, "default")).returning();
    if (updated) return updated;
    const [inserted] = await db.insert(settings).values({ id: "default", ...data }).returning();
    return inserted;
  }
  async getUser(id: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }
  async createUser(data: InsertUser): Promise<User> {
    const id = randomUUID();
    const [u] = await db.insert(users).values({ ...data, id }).returning();
    return u;
  }
  async getStats(): Promise<{
    requestsThisMonth: number;
    pendingRequests: number;
    reviewsThisMonth: number;
    responseRate: number;
    avgRating: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const allCustomers = await db.select().from(customers);
    const requestsThisMonth = allCustomers.filter(c => c.createdAt >= monthStart && c.status !== "pending_request").length;
    const pendingRequests = allCustomers.filter(c => c.status === "request_sent" && !c.doNotContact).length;
    const allReviews = await db.select().from(reviews);
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
    // Find customers whose earliest sentAt is older than 14 days
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
      .where(sql`${customers.id} = ANY(${ids}) AND ${customers.status} = 'request_sent'`)
      .returning();
    return result.length;
  }

  async sendFollowUps(): Promise<number> {
    const now = new Date();
    const day3cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const day7cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all customers still waiting (not clicked, not reviewed, not opted out)
    const eligible = await db.select().from(customers).where(
      and(eq(customers.status, "request_sent"), eq(customers.doNotContact, false))
    );

    let sent = 0;
    for (const customer of eligible) {
      const requests = await db.select().from(reviewRequests)
        .where(and(eq(reviewRequests.customerId, customer.id), sql`${reviewRequests.sentAt} IS NOT NULL`))
        .orderBy(reviewRequests.sentAt);

      const sentCount = requests.length;
      const firstSentAt = requests[0]?.sentAt;
      if (!firstSentAt) continue;

      const shouldSendSecond = sentCount === 1 && firstSentAt <= day3cutoff;
      const shouldSendThird  = sentCount === 2 && firstSentAt <= day7cutoff;

      if (shouldSendSecond || shouldSendThird) {
        const followUpNum = sentCount + 1;
        await db.insert(reviewRequests).values({
          id: randomUUID(),
          customerId: customer.id,
          status: "sent",
          channel: customer.channel,
          sentAt: now,
          followUpCount: sentCount,
        });
        await this.createActivity({
          id: randomUUID(),
          type: "request_sent",
          customerId: customer.id,
          customerName: customer.name,
          message: `Follow-up #${followUpNum} sent automatically to ${customer.name} via ${customer.channel}`,
          metadata: "{}",
        });
        sent++;
      }
    }
    return sent;
  }
}

export const storage = new DatabaseStorage();
