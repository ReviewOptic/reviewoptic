import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, sql, inArray, or } from "drizzle-orm";
import pkg from "pg";
const { Pool } = pkg;
import { randomUUID } from "crypto";
import { sendFollowUpEmail } from "./email";
import { sendReviewSMS, sendWhatsAppTemplate } from "./sms";
import {
  accounts, customers, reviewRequests, reviews, privateFeedback, activityLog, templates, users, passwordResetTokens, reactivationTokens, adminImpersonationLog,
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

// Convert a raw DB row (snake_case) to camelCase for the Settings type
function settingsRowToCamel(row: Record<string, any>): Settings {
  const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v])) as Settings;
}

// Accounts that should never be treated as a real customer — the public
// try-before-signup demo (auto-recreated every few days) and the account
// created for Meta's app reviewers. Excluded from admin stats/lists and
// from any automated email job that targets "real" subscribers.
export const NON_CUSTOMER_EMAILS = ["demo@reviewoptic.com", "meta-reviewer@reviewoptic.com"];

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
// Prevent stale connections (e.g. Neon serverless suspend) from crashing the server
pool.on("error", (err) => {
  console.error("[pool] Unexpected idle client error:", err.message);
});
const db = drizzle(pool);

export interface IStorage {
  // Accounts
  createAccount(): Promise<Account>;
  // Customers
  getCustomers(accountId: string): Promise<Customer[]>;
  getArchivedCustomers(accountId: string): Promise<Customer[]>;
  getDeletedCustomers(accountId: string): Promise<Customer[]>;
  getCustomer(id: string, accountId: string): Promise<Customer | undefined>;
  findDuplicateCustomer(accountId: string, email: string, phone: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>, accountId: string): Promise<Customer | undefined>;
  deleteCustomer(id: string, accountId: string): Promise<void>;
  reactivateCustomer(id: string, accountId: string): Promise<void>;
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
  deleteTemplate(id: string, accountId: string): Promise<void>;
  // Settings
  getSettings(accountId: string): Promise<Settings | undefined>;
  upsertSettings(accountId: string, data: Partial<InsertSettings>): Promise<Settings>;
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  verifyUserEmail(token: string): Promise<User | undefined>;
  updateVerificationToken(userId: string, token: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getAdminUserStats(): Promise<{ userId: string; customerCount: number; reviewRequestCount: number; lastActive: Date | null }[]>;
  verifyUserManually(userId: string): Promise<void>;
  deleteUserAccount(userId: string): Promise<void>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<void>;
  logImpersonation(adminId: string, adminEmail: string, targetUserId: string, targetEmail: string): Promise<void>;
  getImpersonationLog(): Promise<import("@shared/schema").AdminImpersonationLog[]>;
  // Password reset tokens
  createResetToken(userId: string): Promise<string>;
  getResetToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
  deleteResetToken(token: string): Promise<void>;
  // Reactivation tokens (magic sign-in links for "Reactivate" / "Delete my data" email buttons)
  createReactivationToken(userId: string): Promise<string>;
  getReactivationToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
  deleteReactivationToken(token: string): Promise<void>;
  // Stats
  getStats(accountId: string): Promise<{
    requestsThisMonth: number;
    pendingRequests: number;
    clicksThisMonth: number;
    clickRate: number;
    averageRating: number | null;
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
    return db.select().from(customers).where(and(eq(customers.accountId, accountId), eq(customers.archived, false), sql`${customers.deletedAt} IS NULL`)).orderBy(desc(customers.createdAt));
  }
  async getArchivedCustomers(accountId: string): Promise<Customer[]> {
    return db.select().from(customers).where(and(eq(customers.accountId, accountId), eq(customers.archived, true), sql`${customers.deletedAt} IS NULL`)).orderBy(desc(customers.createdAt));
  }
  async getDeletedCustomers(accountId: string): Promise<Customer[]> {
    return db.select().from(customers).where(and(eq(customers.accountId, accountId), sql`${customers.deletedAt} IS NOT NULL`)).orderBy(desc(customers.deletedAt));
  }
  async getCustomer(id: string, accountId: string): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.accountId, accountId)));
    return c;
  }
  async findDuplicateCustomer(accountId: string, email: string, phone: string): Promise<Customer | undefined> {
    if (!email && !phone) return undefined;
    const conditions = [];
    if (email) conditions.push(eq(customers.email, email));
    if (phone) conditions.push(eq(customers.phone, phone));
    const [c] = await db.select().from(customers).where(
      and(eq(customers.accountId, accountId), sql`${customers.deletedAt} IS NULL`, or(...conditions))
    ).limit(1);
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
  async reactivateCustomer(id: string, accountId: string): Promise<void> {
    await db.update(customers).set({ deletedAt: null }).where(and(eq(customers.id, id), eq(customers.accountId, accountId)));
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
  async deleteTemplate(id: string, accountId: string): Promise<void> {
    await db.delete(templates).where(and(eq(templates.id, id), eq(templates.accountId, accountId)));
  }

  async getSettings(accountId: string): Promise<Settings | undefined> {
    const { rows } = await pool.query(`SELECT * FROM settings WHERE account_id = $1 LIMIT 1`, [accountId]);
    if (!rows[0]) return undefined;
    return settingsRowToCamel(rows[0]);
  }
  async upsertSettings(accountId: string, data: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings(accountId);
    const toSnake = (s: string) => s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`).replace(/([a-z])(\d)/g, "$1_$2");
    let entries = Object.entries(data).filter(([, v]) => v !== undefined);

    if (existing) {
      if (entries.length === 0) return existing;
      // Retry loop: if a column doesn't exist in the DB yet, drop it and retry
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const setClauses = entries.map(([k], i) => `"${toSnake(k)}" = $${i + 2}`).join(", ");
          const values = entries.map(([, v]) => v);
          const { rows } = await pool.query(
            `UPDATE settings SET ${setClauses} WHERE account_id = $1 RETURNING *`,
            [accountId, ...values]
          );
          return settingsRowToCamel(rows[0]);
        } catch (err: any) {
          const missing = err.message?.match(/column "([^"]+)" of relation/)?.[1];
          if (missing) {
            entries = entries.filter(([k]) => toSnake(k) !== missing);
            if (entries.length === 0) return existing;
            continue;
          }
          throw err;
        }
      }
    }
    const allEntries: [string, any][] = [["id", randomUUID()], ["account_id", accountId], ...entries.map(([k, v]) => [toSnake(k), v] as [string, any])];
    const cols = allEntries.map(([k]) => `"${k}"`).join(", ");
    const placeholders = allEntries.map((_, i) => `$${i + 1}`).join(", ");
    const vals = allEntries.map(([, v]) => v);
    const { rows } = await pool.query(`INSERT INTO settings (${cols}) VALUES (${placeholders}) RETURNING *`, vals);
    return settingsRowToCamel(rows[0]);
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
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.email);
  }
  async getAdminUserStats(): Promise<{ userId: string; customerCount: number; reviewRequestCount: number; lastActive: Date | null }[]> {
    const { rows } = await pool.query(`
      SELECT u.id AS user_id,
             COUNT(DISTINCT c.id)::int AS customer_count,
             COUNT(DISTINCT rr.id)::int AS review_request_count,
             MAX(al.created_at) AS last_active
      FROM users u
      LEFT JOIN customers c ON c.account_id = u.account_id
      LEFT JOIN review_requests rr ON rr.account_id = u.account_id
      LEFT JOIN activity_log al ON al.account_id = u.account_id
      GROUP BY u.id
      ORDER BY u.email
    `);
    return rows.map((r: any) => ({
      userId: r.user_id,
      customerCount: r.customer_count ?? 0,
      reviewRequestCount: r.review_request_count ?? 0,
      lastActive: r.last_active ?? null,
    }));
  }
  async verifyUserManually(userId: string): Promise<void> {
    await db.update(users).set({ emailVerified: true, verificationToken: null }).where(eq(users.id, userId));
  }
  async deleteUserAccount(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    const aid = user.accountId;
    await db.delete(activityLog).where(eq(activityLog.accountId, aid));
    await db.delete(reviewRequests).where(eq(reviewRequests.accountId, aid));
    await db.delete(reviews).where(eq(reviews.accountId, aid));
    await db.delete(privateFeedback).where(eq(privateFeedback.accountId, aid));
    await db.delete(customers).where(eq(customers.accountId, aid));
    await db.delete(templates).where(eq(templates.accountId, aid));
    await pool.query(`DELETE FROM settings WHERE account_id = $1`, [aid]);
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(accounts).where(eq(accounts.id, aid));
  }
  async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));
  }
  async logImpersonation(adminId: string, adminEmail: string, targetUserId: string, targetEmail: string): Promise<void> {
    await db.insert(adminImpersonationLog).values({ id: randomUUID(), adminId, adminEmail, targetUserId, targetEmail });
  }
  async getImpersonationLog(): Promise<import("@shared/schema").AdminImpersonationLog[]> {
    return db.select().from(adminImpersonationLog).orderBy(desc(adminImpersonationLog.createdAt));
  }
  async verifyUserEmail(token: string): Promise<User | undefined> {
    const [u] = await db
      .update(users)
      .set({ emailVerified: true, verificationToken: null })
      .where(and(eq(users.verificationToken, token), eq(users.emailVerified, false)))
      .returning();
    return u;
  }
  async updateVerificationToken(userId: string, token: string): Promise<void> {
    await db.update(users).set({ verificationToken: token }).where(eq(users.id, userId));
  }
  async createResetToken(userId: string): Promise<string> {
    // Remove any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
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
  // Reactivation tokens — one-time login links used by the "Reactivate" and "Delete my data"
  // buttons in emails, so clicking them logs back into the existing account instead of
  // treating the person as a brand new, logged-out visitor.
  async createReactivationToken(userId: string): Promise<string> {
    await db.delete(reactivationTokens).where(eq(reactivationTokens.userId, userId));
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days — matches the purge window
    await db.insert(reactivationTokens).values({ token, userId, expiresAt });
    return token;
  }
  async getReactivationToken(token: string): Promise<{ userId: string; expiresAt: Date } | undefined> {
    const [row] = await db.select().from(reactivationTokens).where(eq(reactivationTokens.token, token));
    if (!row) return undefined;
    return { userId: row.userId, expiresAt: row.expiresAt };
  }
  async deleteReactivationToken(token: string): Promise<void> {
    await db.delete(reactivationTokens).where(eq(reactivationTokens.token, token));
  }

  // sentByUserId: when provided (team members), every metric is scoped to just the requests
  // that user personally sent, instead of the whole account's combined totals.
  async getStats(accountId: string, sentByUserId?: string): Promise<{
    requestsThisMonth: number;
    pendingRequests: number;
    clicksThisMonth: number;
    clickRate: number;
    averageRating: number | null;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (sentByUserId) {
      const [rrRes, pendingRes, clicksRes, sentRes, clickedRes, ratingRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS count FROM review_requests WHERE account_id = $1 AND sent_by_user_id = $2 AND created_at >= $3`,
          [accountId, sentByUserId, monthStart]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM private_feedback pf JOIN review_requests rr ON rr.id = pf.review_request_id
           WHERE pf.account_id = $1 AND pf.responded = false AND rr.sent_by_user_id = $2`,
          [accountId, sentByUserId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM customers c WHERE c.account_id = $1 AND c.status = 'clicked' AND c.created_at >= $3
           AND EXISTS (SELECT 1 FROM review_requests rr WHERE rr.customer_id = c.id AND rr.sent_by_user_id = $2)`,
          [accountId, sentByUserId, monthStart]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM customers c WHERE c.account_id = $1 AND c.status != 'pending_request'
           AND EXISTS (SELECT 1 FROM review_requests rr WHERE rr.customer_id = c.id AND rr.sent_by_user_id = $2)`,
          [accountId, sentByUserId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM customers c WHERE c.account_id = $1 AND c.status = 'clicked'
           AND EXISTS (SELECT 1 FROM review_requests rr WHERE rr.customer_id = c.id AND rr.sent_by_user_id = $2)`,
          [accountId, sentByUserId]
        ),
        pool.query(
          `SELECT AVG(rating) AS avg FROM review_requests WHERE account_id = $1 AND sent_by_user_id = $2 AND rating IS NOT NULL`,
          [accountId, sentByUserId]
        ),
      ]);
      const sent = sentRes.rows[0]?.count ?? 0;
      const clicked = clickedRes.rows[0]?.count ?? 0;
      const avg = ratingRes.rows[0]?.avg;
      return {
        requestsThisMonth: rrRes.rows[0]?.count ?? 0,
        pendingRequests: pendingRes.rows[0]?.count ?? 0,
        clicksThisMonth: clicksRes.rows[0]?.count ?? 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        averageRating: avg != null ? Math.round(Number(avg) * 10) / 10 : null,
      };
    }

    const [{ count: rrCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviewRequests)
      .where(and(eq(reviewRequests.accountId, accountId), sql`${reviewRequests.createdAt} >= ${monthStart}`));
    const requestsThisMonth = Number(rrCount);
    const [{ count: pendingCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(privateFeedback)
      .where(and(eq(privateFeedback.accountId, accountId), eq(privateFeedback.responded, false)));
    const pendingRequests = Number(pendingCount);
    const [{ count: clicksCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(eq(customers.accountId, accountId), eq(customers.status, "clicked"), sql`${customers.createdAt} >= ${monthStart}`));
    const clicksThisMonth = Number(clicksCount ?? 0);
    const [{ count: sentCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(eq(customers.accountId, accountId), sql`${customers.status} != 'pending_request'`));
    const sent = Number(sentCount ?? 0);
    const [{ count: clickedCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(and(eq(customers.accountId, accountId), eq(customers.status, "clicked")));
    const clicked = Number(clickedCount ?? 0);
    const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
    const [{ avg }] = await db
      .select({ avg: sql<number>`avg(rating)` })
      .from(reviewRequests)
      .where(and(eq(reviewRequests.accountId, accountId), sql`rating IS NOT NULL`));
    const averageRating = avg != null ? Math.round(Number(avg) * 10) / 10 : null;
    return { requestsThisMonth, pendingRequests, clicksThisMonth, clickRate, averageRating };
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
    // Include all statuses where a follow-up may still need to be sent
    const activeCustomers = await db.select().from(customers).where(
      and(
        inArray(customers.status, ["request_sent", "follow_up_1_sent", "follow_up_2_sent", "follow_up_3_sent"]),
        eq(customers.doNotContact, false),
        eq(customers.archived, false)
      )
    );
    if (activeCustomers.length === 0) return 0;

    const accountIds = Array.from(new Set(activeCustomers.map(c => c.accountId)));
    let totalSent = 0;
    const now = new Date();

    // Batch-fetch all review requests for active customers in one query
    const customerIds = activeCustomers.map(c => c.id);
    const allRequests = customerIds.length > 0
      ? await db.select().from(reviewRequests)
          .where(and(inArray(reviewRequests.customerId, customerIds), sql`${reviewRequests.sentAt} IS NOT NULL`))
          .orderBy(reviewRequests.sentAt)
      : [];
    const requestsByCustomer = new Map<string, typeof allRequests>();
    for (const r of allRequests) {
      const existing = requestsByCustomer.get(r.customerId) ?? [];
      existing.push(r);
      requestsByCustomer.set(r.customerId, existing);
    }

    for (const accountId of accountIds) {
      const s = await this.getSettings(accountId);
      if (!s?.followUpEnabled) continue;

      const followUp1Days = s.followUp1Days ?? 3;
      const followUp2Days = s.followUp2Days ?? 7;
      const followUp3Days = s.followUp3Days ?? 14;
      const maxFollowUps = s.maxFollowUps ?? 2;

      const cutoff1 = new Date(now.getTime() - followUp1Days * 24 * 60 * 60 * 1000);
      const cutoff2 = new Date(now.getTime() - followUp2Days * 24 * 60 * 60 * 1000);
      const cutoff3 = new Date(now.getTime() - followUp3Days * 24 * 60 * 60 * 1000);

      const eligible = activeCustomers.filter(c => c.accountId === accountId);

      for (const customer of eligible) {
        const requests = requestsByCustomer.get(customer.id) ?? [];

        const sentCount = requests.length;
        const firstSentAt = requests[0]?.sentAt;
        if (!firstSentAt) continue;

        // Never send two messages to the same customer within 24 hours — prevents
        // cascading follow-ups firing on rapid redeploys when original was sent long ago
        const lastSentAt = requests[requests.length - 1]?.sentAt;
        if (lastSentAt && (now.getTime() - new Date(lastSentAt).getTime()) < 24 * 60 * 60 * 1000) continue;

        // Skip customers who rated 1-3 stars — they're in the private feedback track
        const hasLowRating = requests.some(r => r.rating !== null && r.rating <= 3);
        if (hasLowRating) continue;

        // Track whether already rated 4-5★ (used to pre-set rating on new request)
        const hasHighRating = requests.some(r => r.rating !== null && r.rating >= 4);

        // If all follow-ups are exhausted, mark no_response and move on
        if (sentCount > maxFollowUps) {
          await this.updateCustomer(customer.id, { status: "no_response" }, accountId);
          continue;
        }

        // Determine whether it's time to send the next follow-up (all cutoffs measured from original send)
        let nextStatus: string;
        let shouldSend = false;
        if (sentCount === 1) {
          shouldSend = firstSentAt <= cutoff1;
          nextStatus = "follow_up_1_sent";
        } else if (sentCount === 2 && maxFollowUps >= 2) {
          shouldSend = firstSentAt <= cutoff2;
          nextStatus = "follow_up_2_sent";
        } else if (sentCount === 3 && maxFollowUps >= 3) {
          shouldSend = firstSentAt <= cutoff3;
          nextStatus = "follow_up_3_sent";
        } else {
          continue;
        }

        if (!shouldSend) continue;

        const templateType = `follow_up_${sentCount}`;
        const allTemplates = hasHighRating ? await this.getTemplates(accountId) : [];

        // Pre-set rating on the new request if already rated 4-5★ so ReviewLanding skips
        // the star step and goes straight to the platform buttons page
        const existingRating = hasHighRating
          ? (requests.find(r => r.rating !== null && r.rating >= 4)?.rating ?? null)
          : null;

        // Insert a new review_request row for this follow-up
        const newRequestId = randomUUID();
        await db.insert(reviewRequests).values({
          id: newRequestId,
          accountId: customer.accountId,
          customerId: customer.id,
          status: "pending",
          channel: customer.channel,
          sentAt: now,
          followUpCount: sentCount,
          ...(existingRating ? { rating: existingRating } : {}),
        });

        // Update customer status
        await this.updateCustomer(customer.id, { status: nextStatus }, accountId);

        await this.createActivity({
          id: randomUUID(),
          accountId: customer.accountId,
          type: "request_sent",
          customerId: customer.id,
          customerName: customer.name,
          message: `Follow-up #${sentCount} sent automatically to ${customer.name} via ${customer.channel}`,
          metadata: "{}",
        });

        const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
        const ratingLink = `${appUrl}/review?rid=${newRequestId}`;
        const smsLink = `${appUrl}/r/${newRequestId}`;
        const firstName = customer.name.split(" ")[0];

        const ownerFirstName = (s.ownerName || "").split(" ")[0];
        const resolveBody = (tmpl: any, link = ratingLink) => {
          if (!tmpl?.body) return null;
          let out = tmpl.body
            .replace(/\{\{customer_name\}\}/g, customer.name)
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{business_name\}\}/g, s.businessName)
            .replace(/\{\{owner_name\}\}/g, ownerFirstName)
            .replace(/\{\{review_link\}\}/g, "");
          if (!customer.serviceType) {
            out = out.replace(/\s*and our \{\{service_type\}\}/gi, "").replace(/\{\{service_type\}\}/g, "");
          } else {
            out = out.replace(/\{\{service_type\}\}/g, customer.serviceType);
          }
          return out.trim() + `\n${link}`;
        };

        // Generic rating nudges for customers who haven't rated yet (3 different messages)
        const genericEmailSubjects = [
          `We'd love your feedback — ${s.businessName}`,
          `Just a gentle reminder — ${s.businessName}`,
          `Last reminder — we promise!`,
        ];
        const genericEmailBodies = [
          `Hi ${firstName},\n\nWe'd love to hear how your experience with ${s.businessName} was! It only takes a second — tap the button below to leave your rating.`,
          `Hi ${firstName},\n\nJust a gentle reminder that we'd really love to hear how we did! Your feedback means a lot to us — tap below whenever you're ready.`,
          `Hi ${firstName},\n\nThis is our last message, we promise! If you have a moment, your feedback would mean the world to us. Tap below to leave your rating.`,
        ];
        const genericSmsTexts = [
          `Hi ${firstName}, we'd love to hear how your experience was! Tap below to leave a quick rating:`,
          `Hi ${firstName}, just a gentle reminder — we'd love your feedback! Tap below whenever you're ready:`,
          `Hi ${firstName}, last one from us — we'd really appreciate your rating if you get a chance:`,
        ];
        const genericWaTexts = [
          `Hi ${firstName} 😊 We'd love to hear how your experience with ${s.businessName} went! Tap the link below to leave a quick rating 👇`,
          `Hi ${firstName}, just a gentle reminder — we'd really love to know how we did! Tap the link below whenever you're ready 🙏`,
          `Hi ${firstName} 🙏 This is our last message, we promise! If you ever have a moment, we'd really love to hear from you.`,
        ];
        const idx = Math.min(sentCount - 1, 2); // 0, 1, or 2

        if (customer.channel === "email" && customer.email) {
          if (hasHighRating) {
            // Rated 4-5★ but not clicked — use personalised Follow-up 1/2/3 template
            const fuTmpl = allTemplates.find(t => t.channel === "email" && t.templateType === templateType && t.isDefault)
              || allTemplates.find(t => t.channel === "email" && t.templateType === templateType)
              || null;
            sendFollowUpEmail(customer, s, ratingLink, fuTmpl).catch(err =>
              console.error(`[follow-up] Failed to send email to ${customer.email}:`, err.message)
            );
          } else {
            // Not yet rated — generic rating nudge
            sendFollowUpEmail(customer, s, ratingLink, { subject: genericEmailSubjects[idx], body: genericEmailBodies[idx] }).catch(err =>
              console.error(`[follow-up] Failed to send email to ${customer.email}:`, err.message)
            );
          }
        } else if (customer.channel === "sms" && customer.phone) {
          let smsBody: string;
          if (hasHighRating) {
            const tmpl = allTemplates.find(t => t.channel === "sms" && t.templateType === templateType && t.isDefault)
              || allTemplates.find(t => t.channel === "sms" && t.templateType === templateType)
              || null;
            smsBody = resolveBody(tmpl, smsLink) || `Hi ${firstName}, just following up — tap to share your rating:\n${smsLink}`;
          } else {
            smsBody = `${genericSmsTexts[idx]}\n${smsLink}`;
          }
          sendReviewSMS(customer, s, { subject: "", body: smsBody } as any, []).catch(err =>
            console.error(`[follow-up] Failed to send SMS to ${customer.phone}:`, err.message)
          );
        } else if (customer.channel === "whatsapp" && customer.phone) {
          const sid = idx === 0
            ? process.env.WHATSAPP_TEMPLATE_SID_FOLLOWUP
            : process.env.WHATSAPP_TEMPLATE_SID_FOLLOWUP_FINAL;
          if (!sid) {
            console.error(`[follow-up] WhatsApp template SID not configured for idx=${idx}`);
          } else {
            sendWhatsAppTemplate(customer.phone, sid, { "1": firstName, "2": s.businessName, "3": ratingLink }).catch(err =>
              console.error(`[follow-up] Failed to send WhatsApp to ${customer.phone}:`, err.message)
            );
          }
        }

        totalSent++;
      }
    }
    return totalSent;
  }
}

export const storage = new DatabaseStorage();
