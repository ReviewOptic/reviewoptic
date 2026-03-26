import { Resend } from "resend";
import { pool } from "./storage";
import { randomUUID } from "crypto";

interface UserStats {
  businessName: string;
  email: string;
  totalReviews: number;
  avgRating: number;
  reviewsThisMonth: number;
  requestsSentThisMonth: number;
  conversionRate: number;
  bestChannel: string;
  totalCustomers: number;
  avgRatingLastMonth: number;
  reviewsLastMonth: number;
}

async function getUserStats(accountId: string): Promise<UserStats | null> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    settingsRes, totalReviewsRes, avgRatingRes, reviewsThisMonthRes,
    reviewsLastMonthRes, requestsThisMonthRes, channelRes, customersRes,
  ] = await Promise.all([
    pool.query(`SELECT business_name, business_email FROM settings WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT COUNT(*) FROM reviews WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg FROM reviews WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT COUNT(*) FROM reviews WHERE account_id = $1 AND created_at >= $2`, [accountId, startOfThisMonth]),
    pool.query(`SELECT COUNT(*) as count, ROUND(AVG(stars)::numeric, 1) as avg FROM reviews WHERE account_id = $1 AND created_at >= $2 AND created_at < $3`, [accountId, startOfLastMonth, startOfThisMonth]),
    pool.query(`SELECT COUNT(*) FROM review_requests WHERE account_id = $1 AND created_at >= $2`, [accountId, startOfThisMonth]),
    pool.query(`SELECT channel, COUNT(*) as count FROM review_requests WHERE account_id = $1 AND created_at >= $2 GROUP BY channel ORDER BY count DESC LIMIT 1`, [accountId, startOfThisMonth]),
    pool.query(`SELECT COUNT(*) FROM customers WHERE account_id = $1`, [accountId]),
  ]);

  const settings = settingsRes.rows[0];
  if (!settings?.business_email) return null;

  const totalReviews = parseInt(totalReviewsRes.rows[0].count) || 0;
  const avgRating = parseFloat(avgRatingRes.rows[0]?.avg) || 0;
  const reviewsThisMonth = parseInt(reviewsThisMonthRes.rows[0].count) || 0;
  const reviewsLastMonth = parseInt(reviewsLastMonthRes.rows[0]?.count) || 0;
  const avgRatingLastMonth = parseFloat(reviewsLastMonthRes.rows[0]?.avg) || 0;
  const requestsSentThisMonth = parseInt(requestsThisMonthRes.rows[0].count) || 0;
  const conversionRate = requestsSentThisMonth > 0 ? Math.round((reviewsThisMonth / requestsSentThisMonth) * 100) : 0;
  const bestChannel = channelRes.rows[0]?.channel || "email";
  const totalCustomers = parseInt(customersRes.rows[0].count) || 0;

  return {
    businessName: settings.business_name || "Your Business",
    email: settings.business_email,
    totalReviews, avgRating, reviewsThisMonth, reviewsLastMonth,
    avgRatingLastMonth, requestsSentThisMonth, conversionRate,
    bestChannel, totalCustomers,
  };
}

async function generateInsights(stats: UserStats): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const reviewChange = stats.reviewsThisMonth - stats.reviewsLastMonth;
  const prompt = `You are a friendly review management coach writing a monthly performance email for a business called "${stats.businessName}".

Stats this month:
- New reviews: ${stats.reviewsThisMonth} (last month: ${stats.reviewsLastMonth}, change: ${reviewChange >= 0 ? "+" : ""}${reviewChange})
- Average rating: ${stats.avgRating} (last month: ${stats.avgRatingLastMonth || "N/A"})
- Review requests sent: ${stats.requestsSentThisMonth}
- Conversion rate: ${stats.conversionRate}%
- Best channel: ${stats.bestChannel}
- Total customers: ${stats.totalCustomers}
- All-time reviews: ${stats.totalReviews}

Write 3-4 short, specific, actionable insights. Be encouraging but honest. Numbered points (1. 2. 3.). Under 120 words total.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 200,
  });
  return response.choices[0]?.message?.content || "";
}

async function sendInsightEmail(stats: UserStats, insights: string, userId: string, accountId: string, appUrl: string, frequency: string = "weekly"): Promise<void> {
  const logId = randomUUID();

  if (!process.env.RESEND_API_KEY) {
    console.log(`[insight email] No RESEND_API_KEY — would send to ${stats.email}`);
    await pool.query(`INSERT INTO insight_email_log (id, user_id, account_id, email) VALUES ($1, $2, $3, $4)`, [logId, userId, accountId, stats.email]);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const periodLabel = frequency === "weekly" ? "Weekly" : "Monthly";
  const monthName = new Date().toLocaleString("en-GB", { month: "long", year: "numeric" });
  const ratingChange = stats.avgRatingLastMonth ? (stats.avgRating - stats.avgRatingLastMonth) : null;
  const reviewChange = stats.reviewsThisMonth - stats.reviewsLastMonth;

  const trackingPixel = `<img src="${appUrl}/api/insight/track-open?id=${logId}" width="1" height="1" style="display:none;" />`;
  const optOutUrl = `${appUrl}/api/insight/opt-out?id=${logId}&uid=${userId}`;

  const statRow = (label: string, value: string, change?: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">${value}${change ? ` <span style="font-size:12px;color:${change.startsWith("+") ? "#16a34a" : "#dc2626"}">${change}</span>` : ""}</td>
    </tr>`;

  const insightsHtml = insights
    ? `<div style="background:#f8fafc;border-radius:8px;padding:20px;margin-top:24px;">
        <h3 style="font-size:15px;font-weight:700;margin:0 0 12px;color:#111;">Your personalised insights</h3>
        <p style="color:#444;font-size:14px;line-height:1.7;margin:0;">${insights.replace(/\n/g, "<br>")}</p>
       </div>`
    : "";

  await resend.emails.send({
    from: "ReviewOptic <noreply@reviewoptic.com>",
    to: stats.email,
    subject: `Your ${periodLabel.toLowerCase()} review report — ${monthName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:28px;"><a href="https://reviewoptic.com" style="text-decoration:none;"><img src="${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com")}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></a></div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">${periodLabel} Review Report</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px;">${monthName} · ${stats.businessName}</p>

        <table style="width:100%;border-collapse:collapse;">
          ${statRow("New reviews this period", String(stats.reviewsThisMonth), reviewChange !== 0 ? `${reviewChange >= 0 ? "+" : ""}${reviewChange} vs last period` : undefined)}
          ${statRow("Average star rating", stats.avgRating ? `${stats.avgRating} ⭐` : "No data", ratingChange !== null && ratingChange !== 0 ? `${ratingChange >= 0 ? "+" : ""}${ratingChange.toFixed(1)}` : undefined)}
          ${statRow("Review requests sent", String(stats.requestsSentThisMonth))}
          ${statRow("Conversion rate", `${stats.conversionRate}%`)}
          ${statRow("Best channel", stats.bestChannel.charAt(0).toUpperCase() + stats.bestChannel.slice(1))}
          ${statRow("Total reviews (all time)", String(stats.totalReviews))}
        </table>

        ${insightsHtml}

        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          You're receiving ${periodLabel.toLowerCase()} review reports as a ReviewOptic subscriber.<br>
          <a href="${appUrl}/settings?tab=notifications" style="color:#999;">Change email frequency</a> · <a href="${optOutUrl}" style="color:#999;">Unsubscribe</a>
        </p>
        ${trackingPixel}
      </div>
    `,
  });

  await pool.query(`INSERT INTO insight_email_log (id, user_id, account_id, email) VALUES ($1, $2, $3, $4)`, [logId, userId, accountId, stats.email]);
}

export async function runMonthlyInsightEmails(): Promise<void> {
  const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

  const { rows: users } = await pool.query(`
    SELECT id, account_id, insight_email_frequency FROM users
    WHERE NOT is_admin
      AND email_verified = true
      AND plan_type NOT IN ('free', 'complimentary')
      AND role = 'owner'
      AND insight_email_frequency != 'never'
      AND insight_emails_opt_out = false
      AND COALESCE(email_unsubscribed, false) = false
      AND (
        last_insight_email_at IS NULL
        OR (insight_email_frequency = 'weekly'  AND last_insight_email_at < NOW() - INTERVAL '7 days')
        OR (insight_email_frequency = 'monthly' AND last_insight_email_at < NOW() - INTERVAL '30 days')
      )
  `);

  for (const user of users) {
    try {
      const stats = await getUserStats(user.account_id);
      if (!stats) continue;
      const insights = await generateInsights(stats);
      await sendInsightEmail(stats, insights, user.id, user.account_id, appUrl, user.insight_email_frequency);
      await pool.query(`UPDATE users SET last_insight_email_at = NOW() WHERE id = $1`, [user.id]);
      console.log(`[insight email] Sent to ${stats.email}`);
    } catch (err: any) {
      console.error(`[insight email] Failed for user ${user.id}:`, err.message);
    }
  }
}
