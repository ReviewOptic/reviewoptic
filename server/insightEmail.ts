import { Resend } from "resend";
import { pool } from "./storage";
import { randomUUID } from "crypto";

interface UserStats {
  businessName: string;
  businessType: string;
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
  platformClicks: { platform: string; count: number }[];
  bestDay: string;
  ratingDistribution: { stars: number; count: number; pct: number }[];
}

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Industry benchmarks keyed by business_type value
const BENCHMARKS: Record<string, { label: string; conversionRange: string; ratingRange: string; topPlatform: string; insightNote: string }> = {
  plumber:      { label: "Plumbers & Heating Engineers", conversionRange: "20–35%", ratingRange: "4.4–4.8 ⭐", topPlatform: "Google",              insightNote: "Most customers search Google first when looking for a plumber." },
  electrician:  { label: "Electricians",                 conversionRange: "20–35%", ratingRange: "4.4–4.8 ⭐", topPlatform: "Google",              insightNote: "Word of mouth and Google are the two biggest sources of new electrician work." },
  builder:      { label: "Builders & Contractors",       conversionRange: "20–30%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google / Checkatrade", insightNote: "Builders with 20+ reviews are significantly more likely to be shortlisted." },
  landscaping:  { label: "Landscaping & Gardening",      conversionRange: "20–35%", ratingRange: "4.4–4.8 ⭐", topPlatform: "Google",              insightNote: "Seasonal businesses benefit most from collecting reviews year-round." },
  cleaning:     { label: "Cleaning Services",            conversionRange: "25–40%", ratingRange: "4.5–4.9 ⭐", topPlatform: "Google / Facebook",    insightNote: "Repeat customers are the most reliable source of reviews — always ask after each visit." },
  salon:        { label: "Hair Salons & Barbers",        conversionRange: "25–40%", ratingRange: "4.5–4.9 ⭐", topPlatform: "Google / Facebook",    insightNote: "Loyal clients are highly likely to leave a review when asked — most just need a nudge." },
  beauty:       { label: "Beauty, Spa & Nails",          conversionRange: "25–40%", ratingRange: "4.5–4.9 ⭐", topPlatform: "Google / Facebook",    insightNote: "Instagram-savvy clients often check Google reviews before booking a new therapist." },
  restaurant:   { label: "Restaurants, Cafés & Takeaways", conversionRange: "10–20%", ratingRange: "4.1–4.5 ⭐", topPlatform: "Google / TripAdvisor", insightNote: "Restaurants with 50+ reviews see significantly higher foot traffic from search." },
  dentist:      { label: "Dentists",                     conversionRange: "15–25%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google",              insightNote: "Patients trust reviews more than any other form of recommendation when choosing a dentist." },
  healthcare:   { label: "GPs, Doctors & Clinics",       conversionRange: "15–25%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google",              insightNote: "Healthcare providers with strong Google ratings attract more self-pay and private patients." },
  optician:     { label: "Opticians",                    conversionRange: "15–25%", ratingRange: "4.4–4.8 ⭐", topPlatform: "Google",              insightNote: "Patients rarely switch opticians — but they will if you have noticeably better reviews." },
  physio:       { label: "Physiotherapists & Chiropractors", conversionRange: "20–30%", ratingRange: "4.5–4.9 ⭐", topPlatform: "Google",           insightNote: "Detailed reviews describing specific outcomes drive the most new referrals." },
  fitness:      { label: "Personal Trainers & Gyms",     conversionRange: "25–40%", ratingRange: "4.4–4.8 ⭐", topPlatform: "Google / Facebook",    insightNote: "Transformation stories in reviews are the single biggest driver of new sign-ups." },
  estate_agent: { label: "Estate Agents",                conversionRange: "15–25%", ratingRange: "4.2–4.6 ⭐", topPlatform: "Google",              insightNote: "Sellers shortlist agents with 50+ reviews at twice the rate of those with fewer." },
  letting_agent:{ label: "Letting Agents",               conversionRange: "15–25%", ratingRange: "4.1–4.5 ⭐", topPlatform: "Google",              insightNote: "Landlords read reviews carefully — a single detailed positive review can win a management contract." },
  garage:       { label: "Car Mechanics & Garages",      conversionRange: "20–30%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google",              insightNote: "Customers typically read 5–7 reviews before choosing a garage for the first time." },
  accountant:   { label: "Accountants",                  conversionRange: "15–25%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google",              insightNote: "Accounting firms with 20+ reviews are 3× more likely to be shortlisted by new business owners." },
  solicitor:    { label: "Solicitors & Legal Services",  conversionRange: "15–20%", ratingRange: "4.2–4.6 ⭐", topPlatform: "Google",              insightNote: "Legal clients spend the most time reading reviews before making contact — quality matters over quantity." },
  financial:    { label: "Financial Advisers",           conversionRange: "15–25%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google",              insightNote: "Trust is the top factor for new financial clients — verified reviews are the fastest way to build it." },
  hotel:        { label: "Hotels, B&Bs & Guesthouses",   conversionRange: "15–25%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google / TripAdvisor", insightNote: "Every extra 0.1 star on your average rating increases bookings by approximately 3%." },
  vet:          { label: "Vets & Pet Services",          conversionRange: "20–30%", ratingRange: "4.5–4.9 ⭐", topPlatform: "Google",              insightNote: "Pet owners are highly loyal and highly vocal — they're among the most willing reviewers when asked." },
  nursery:      { label: "Nurseries & Childcare",        conversionRange: "20–30%", ratingRange: "4.5–4.9 ⭐", topPlatform: "Google / Facebook",    insightNote: "Parents rely on reviews more than any other source when choosing childcare." },
};

const DEFAULT_BENCHMARK = { label: "Local service businesses", conversionRange: "15–30%", ratingRange: "4.3–4.7 ⭐", topPlatform: "Google", insightNote: "Businesses that ask every customer for a review collect 5× more reviews than those that ask occasionally." };

async function getUserStats(accountId: string): Promise<UserStats | null> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    settingsRes, totalReviewsRes, avgRatingRes, reviewsThisMonthRes,
    reviewsLastMonthRes, requestsThisMonthRes, channelRes, customersRes,
    platformClicksRes, bestDayRes, ratingDistRes,
  ] = await Promise.all([
    pool.query(`SELECT business_name, business_email, business_type FROM settings WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT COUNT(*) FROM reviews WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT ROUND(AVG(stars)::numeric, 1) as avg FROM reviews WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT COUNT(*) FROM reviews WHERE account_id = $1 AND created_at >= $2`, [accountId, startOfThisMonth]),
    pool.query(`SELECT COUNT(*) as count, ROUND(AVG(stars)::numeric, 1) as avg FROM reviews WHERE account_id = $1 AND created_at >= $2 AND created_at < $3`, [accountId, startOfLastMonth, startOfThisMonth]),
    pool.query(`SELECT COUNT(*) FROM review_requests WHERE account_id = $1 AND created_at >= $2`, [accountId, startOfThisMonth]),
    pool.query(`SELECT channel, COUNT(*) as count FROM review_requests WHERE account_id = $1 AND created_at >= $2 GROUP BY channel ORDER BY count DESC LIMIT 1`, [accountId, startOfThisMonth]),
    pool.query(`SELECT COUNT(*) FROM customers WHERE account_id = $1`, [accountId]),
    pool.query(`SELECT platform, COUNT(*) as count FROM review_platform_clicks WHERE account_id = $1 AND clicked_at >= $2 GROUP BY platform ORDER BY count DESC`, [accountId, startOfThisMonth]),
    pool.query(`SELECT EXTRACT(DOW FROM clicked_at)::int as dow, COUNT(*) as clicks FROM review_requests WHERE account_id = $1 AND clicked_at >= $2 AND clicked_at IS NOT NULL GROUP BY dow ORDER BY clicks DESC LIMIT 1`, [accountId, thirtyDaysAgo]),
    pool.query(`SELECT rating, COUNT(*) as cnt FROM review_requests WHERE account_id = $1 AND rating IS NOT NULL GROUP BY rating ORDER BY rating DESC`, [accountId]),
  ]);

  const settings = settingsRes.rows[0];
  if (!settings) return null;

  const totalReviews = parseInt(totalReviewsRes.rows[0].count) || 0;
  const avgRating = parseFloat(avgRatingRes.rows[0]?.avg) || 0;
  const reviewsThisMonth = parseInt(reviewsThisMonthRes.rows[0].count) || 0;
  const reviewsLastMonth = parseInt(reviewsLastMonthRes.rows[0]?.count) || 0;
  const avgRatingLastMonth = parseFloat(reviewsLastMonthRes.rows[0]?.avg) || 0;
  const requestsSentThisMonth = parseInt(requestsThisMonthRes.rows[0].count) || 0;
  const conversionRate = requestsSentThisMonth > 0 ? Math.round((reviewsThisMonth / requestsSentThisMonth) * 100) : 0;
  const bestChannel = channelRes.rows[0]?.channel || "email";
  const totalCustomers = parseInt(customersRes.rows[0].count) || 0;
  const platformClicks = platformClicksRes.rows.map(r => ({
    platform: r.platform.charAt(0).toUpperCase() + r.platform.slice(1),
    count: parseInt(r.count) || 0,
  }));
  const bestDay = bestDayRes.rows[0] ? DOW_NAMES[bestDayRes.rows[0].dow] : "No data yet";
  const totalRatings = ratingDistRes.rows.reduce((sum: number, r: any) => sum + parseInt(r.cnt), 0);
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const row = ratingDistRes.rows.find((r: any) => parseInt(r.rating) === stars);
    const count = row ? parseInt(row.cnt) : 0;
    return { stars, count, pct: totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0 };
  });

  return {
    businessName: settings.business_name || "Your Business",
    businessType: settings.business_type || "",
    email: settings.business_email || "",
    totalReviews, avgRating, reviewsThisMonth, reviewsLastMonth,
    avgRatingLastMonth, requestsSentThisMonth, conversionRate,
    bestChannel, totalCustomers, platformClicks, bestDay, ratingDistribution,
  };
}

async function generateInsights(stats: UserStats): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const reviewChange = stats.reviewsThisMonth - stats.reviewsLastMonth;
  const ratingText = stats.ratingDistribution
    .filter(r => r.count > 0)
    .map(r => `${r.stars}★: ${r.count} (${r.pct}%)`)
    .join(", ");
  const benchmark = BENCHMARKS[stats.businessType] || DEFAULT_BENCHMARK;

  const prompt = `You are a review management coach writing a performance email for "${stats.businessName}", a ${benchmark.label} business.

Their data this period:
- New reviews: ${stats.reviewsThisMonth} (last period: ${stats.reviewsLastMonth}, change: ${reviewChange >= 0 ? "+" : ""}${reviewChange})
- Average rating: ${stats.avgRating || "No data"} stars
- Rating breakdown: ${ratingText || "No ratings yet"}
- Requests sent: ${stats.requestsSentThisMonth}, Conversion rate: ${stats.conversionRate}%
- Industry average conversion: ${benchmark.conversionRange}
- Best day to send: ${stats.bestDay}
- Best channel: ${stats.bestChannel}
- All-time reviews: ${stats.totalReviews}

Write exactly 3 short, specific, actionable tips to help them get more reviews. Tailor each tip to their industry (${benchmark.label}) and their actual stats above. If their conversion is below the ${benchmark.conversionRange} industry range, suggest improvements. If a channel is performing well, suggest doubling down. If they have low-star ratings, suggest following up with those customers.

Format: numbered list (1. 2. 3.), one sentence each. Under 100 words total. No intro sentence.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 180,
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
  const now = new Date();
  const periodDateLabel = frequency === "weekly"
    ? (() => {
        const end = new Date(now);
        end.setDate(end.getDate() - 1);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        const fmt = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short" });
        const yearSuffix = start.getFullYear() !== end.getFullYear() || end.getFullYear() !== now.getFullYear()
          ? ` ${end.getFullYear()}` : ` ${now.getFullYear()}`;
        return `${fmt(start)} – ${fmt(end)}${yearSuffix}`;
      })()
    : now.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const ratingChange = stats.avgRatingLastMonth ? (stats.avgRating - stats.avgRatingLastMonth) : null;
  const reviewChange = stats.reviewsThisMonth - stats.reviewsLastMonth;
  const benchmark = BENCHMARKS[stats.businessType] || DEFAULT_BENCHMARK;

  const trackingPixel = `<img src="${appUrl}/api/insight/track-open?id=${logId}" width="1" height="1" style="display:none;" />`;
  const optOutUrl = `${appUrl}/api/insight/opt-out?id=${logId}&uid=${userId}`;

  const statRow = (label: string, value: string, change?: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#555;font-size:14px;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">${value}${change ? ` <span style="font-size:12px;color:${change.startsWith("+") ? "#16a34a" : "#dc2626"}">${change}</span>` : ""}</td>
    </tr>`;

  // Rating distribution bars
  const starColour = (stars: number) => stars >= 4 ? "#16a34a" : stars === 3 ? "#d97706" : "#dc2626";
  const starLabel = (stars: number) => "★".repeat(stars) + "☆".repeat(5 - stars);
  const ratingBarsHtml = stats.ratingDistribution.some(r => r.count > 0)
    ? `<div style="margin-top:24px;">
        <h3 style="font-size:15px;font-weight:700;margin:0 0 14px;color:#111;">Rating breakdown</h3>
        ${stats.ratingDistribution.map(r => `
          <div style="display:flex;align-items:center;margin-bottom:8px;gap:10px;">
            <span style="font-size:13px;color:#555;min-width:72px;">${starLabel(r.stars)}</span>
            <div style="flex:1;background:#f0f0f0;border-radius:4px;height:10px;overflow:hidden;">
              <div style="width:${r.pct}%;background:${starColour(r.stars)};height:10px;border-radius:4px;min-width:${r.count > 0 ? "4px" : "0"};"></div>
            </div>
            <span style="font-size:13px;color:#555;min-width:40px;text-align:right;">${r.pct}%</span>
          </div>`).join("")}
      </div>`
    : "";

  // Tips section
  const tipsHtml = insights
    ? `<div style="background:#f0f9ff;border-left:3px solid #0E679D;border-radius:0 8px 8px 0;padding:18px 20px;margin-top:24px;">
        <h3 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#111;">Tips to get more reviews</h3>
        <p style="color:#444;font-size:14px;line-height:1.8;margin:0;">${insights.replace(/\n/g, "<br>")}</p>
       </div>`
    : "";

  // Industry benchmarks — personalised to their business type
  const benchmarksHtml = `
    <div style="background:#f8fafc;border-radius:8px;padding:18px 20px;margin-top:24px;">
      <h3 style="font-size:15px;font-weight:700;margin:0 0 4px;color:#111;">How you compare</h3>
      <p style="color:#888;font-size:12px;margin:0 0 14px;">Industry benchmarks for ${benchmark.label.toLowerCase()}</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:13px;">Typical conversion rate</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:13px;">
            <span style="font-weight:600;">${benchmark.conversionRange}</span>
            ${stats.conversionRate > 0 ? `<span style="font-size:12px;margin-left:6px;color:${stats.conversionRate >= parseInt(benchmark.conversionRange) ? "#16a34a" : "#d97706"};">yours: ${stats.conversionRate}%</span>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:13px;">Average rating in your sector</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:13px;">
            <span style="font-weight:600;">${benchmark.ratingRange}</span>
            ${stats.avgRating > 0 ? `<span style="font-size:12px;margin-left:6px;color:${stats.avgRating >= 4.3 ? "#16a34a" : "#d97706"};">yours: ${stats.avgRating}</span>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:13px;">Top review platform</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:13px;">${benchmark.topPlatform}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#555;font-size:13px;">Lift from one follow-up</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;font-size:13px;">+30–50% more responses</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#555;font-size:13px;font-style:italic;" colspan="2">${benchmark.insightNote}</td>
        </tr>
      </table>
    </div>`;

  const logoUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");

  await resend.emails.send({
    from: "ReviewOptic <noreply@reviewoptic.com>",
    to: stats.email,
    subject: `Your ${periodLabel.toLowerCase()} review report — ${periodDateLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:28px;"><a href="https://reviewoptic.com" style="text-decoration:none;"><img src="${logoUrl}/logo.png" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" /></a></div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">${periodLabel} Review Report</h2>
        <p style="color:#888;font-size:13px;margin:0 0 24px;">${periodDateLabel} · ${stats.businessName}</p>

        <table style="width:100%;border-collapse:collapse;">
          ${statRow("New reviews this period", String(stats.reviewsThisMonth), reviewChange !== 0 ? `${reviewChange >= 0 ? "+" : ""}${reviewChange} vs last period` : undefined)}
          ${statRow("Average star rating", stats.avgRating ? `${stats.avgRating} ⭐` : "No data", ratingChange !== null && ratingChange !== 0 ? `${ratingChange >= 0 ? "+" : ""}${ratingChange.toFixed(1)}` : undefined)}
          ${statRow("Review requests sent", String(stats.requestsSentThisMonth))}
          ${statRow("Conversion rate", `${stats.conversionRate}%`)}
          ${statRow("Best channel", stats.bestChannel.charAt(0).toUpperCase() + stats.bestChannel.slice(1))}
          ${statRow("Best day to send", stats.bestDay)}
          ${statRow("Total reviews (all time)", String(stats.totalReviews))}
        </table>

        ${ratingBarsHtml}

        ${stats.platformClicks.length > 0 ? `
        <div style="margin-top:24px;">
          <h3 style="font-size:15px;font-weight:700;margin:0 0 10px;color:#111;">Platform clicks this period</h3>
          <table style="width:100%;border-collapse:collapse;">
            ${stats.platformClicks.map(p => statRow(p.platform, String(p.count))).join("")}
          </table>
          <p style="color:#888;font-size:12px;margin:8px 0 0;">Each click is a customer who tapped a review platform link. Check your profiles for new reviews.</p>
        </div>` : ""}

        ${tipsHtml}

        ${benchmarksHtml}

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

export async function sendInsightEmailToUser(userId: string, accountId: string, email: string, appUrl: string, frequency = "weekly"): Promise<void> {
  const stats = await getUserStats(accountId);
  if (!stats) throw new Error("No account settings found");
  if (!stats.email) stats.email = email;
  const insights = await generateInsights(stats);
  await sendInsightEmail(stats, insights, userId, accountId, appUrl, frequency);
}

export async function runMonthlyInsightEmails(): Promise<void> {
  const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

  const { rows: users } = await pool.query(`
    SELECT id, email, account_id, insight_email_frequency FROM users
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

  console.log(`[insight email] ${users.length} user(s) due for an insight email`);

  for (const user of users) {
    try {
      const stats = await getUserStats(user.account_id);
      if (!stats) {
        console.warn(`[insight email] Skipping user ${user.id} — no settings found`);
        continue;
      }
      if (!stats.email) stats.email = user.email;
      const insights = await generateInsights(stats);
      await sendInsightEmail(stats, insights, user.id, user.account_id, appUrl, user.insight_email_frequency);
      await pool.query(`UPDATE users SET last_insight_email_at = NOW() WHERE id = $1`, [user.id]);
      console.log(`[insight email] Sent to ${stats.email}`);
    } catch (err: any) {
      console.error(`[insight email] Failed for user ${user.id}:`, err.message);
    }
  }
}
