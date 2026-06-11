import axios from "axios";
import { pool } from "./storage";
import { postCardToSocial, hasBeenPostedAlready } from "./social";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ReviewOptic/1.0; +https://reviewoptic.com)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

// ── Return type for per-platform poll results ────────────────────────────────

export type PlatformResult = {
  platform: string;
  found: number;
  saved: number;
  skipped: boolean;
  error?: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try { results.push(JSON.parse(match[1])); } catch {}
  }
  return results;
}

// Extract reviews from Next.js __NEXT_DATA__ embedded JSON — used by Checkatrade and similar sites
function extractFromNextData(html: string, platform: string): {author: string; rating: number; text: string; date: Date|null; platform: string}[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    return findReviewsInObject(data, platform, 0);
  } catch { return []; }
}

type ReviewItem = {author: string; rating: number; text: string; date: Date|null; platform: string};

function isReviewLike(obj: any): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const hasText = !!(obj.text || obj.body || obj.content || obj.reviewText || obj.comment || obj.description || obj.reviewBody);
  const hasRating = !!(obj.rating !== undefined || obj.score !== undefined || obj.stars !== undefined || obj.reviewRating !== undefined || obj.starRating !== undefined);
  return hasText && hasRating;
}

function extractReviewItem(obj: any, platform: string): ReviewItem | null {
  const text = (obj.text || obj.body || obj.content || obj.reviewText || obj.comment || obj.description || obj.reviewBody || "").toString().trim();
  const ratingRaw = obj.rating ?? obj.score ?? obj.stars ?? obj.reviewRating?.ratingValue ?? obj.starRating?.ratingValue ?? 0;
  const rating = Math.round(parseFloat(String(ratingRaw)));
  const author = (obj.author?.name || obj.authorName || obj.reviewer?.name || obj.reviewerName || (typeof obj.author === "string" ? obj.author : "") || "Anonymous").trim();
  const dateStr = obj.date || obj.createdAt || obj.created_at || obj.datePublished || obj.reviewDate || "";
  if (!text || !rating) return null;
  return { author, rating, text, date: dateStr ? new Date(dateStr) : null, platform };
}

function findReviewsInObject(obj: any, platform: string, depth: number): ReviewItem[] {
  if (depth > 12 || obj === null || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && isReviewLike(obj[0])) {
      return obj.map(r => extractReviewItem(r, platform)).filter(Boolean) as ReviewItem[];
    }
    return obj.flatMap(item => findReviewsInObject(item, platform, depth + 1));
  }
  return Object.values(obj).flatMap(val => findReviewsInObject(val, platform, depth + 1));
}

// Stable dedup key — hashes platform + account + first 80 chars of text
function reviewKey(platform: string, accountId: string, author: string, text: string): string {
  const str = `${platform}|${accountId}|${author.toLowerCase()}|${text.slice(0, 80).toLowerCase()}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// Returns true if this is a newly-saved review
async function saveIfNew(
  accountId: string, platform: string, externalId: string,
  author: string, rating: number, text: string, date: Date | null
): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO external_reviews (id, account_id, platform, external_id, author_name, rating, review_text, review_date)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (account_id, platform, external_id) DO NOTHING`,
      [accountId, platform, externalId, author, rating, text, date]
    );
    const { rows } = await pool.query(
      `SELECT id FROM external_reviews WHERE account_id=$1 AND platform=$2 AND external_id=$3 AND posted_to_social=false AND created_at > NOW() - INTERVAL '10 minutes'`,
      [accountId, platform, externalId]
    );
    return rows.length > 0;
  } catch { return false; }
}

// ── Google Place ID resolution — handles all common URL formats ──────────────

function extractPlaceIdFromUrl(link: string): string | null {
  try {
    const url = new URL(link);
    // Format: ?placeid=ChIJ... or ?place_id=ChIJ...
    for (const param of ["placeid", "place_id"]) {
      const val = url.searchParams.get(param);
      if (val?.startsWith("ChIJ")) return val;
    }
    // Format: /maps/place/.../data=...!1sChIJ...
    const dataMatch = link.match(/!1s(ChIJ[A-Za-z0-9_%-]+)/);
    if (dataMatch) return decodeURIComponent(dataMatch[1]);
  } catch {}
  return null;
}

// Resolve a Google Maps link to a Place ID — extracts from the URL or follows short-link redirects.
// Never falls back to business name search — that would pull the wrong franchise location.
async function resolveGooglePlaceId(link: string, apiKey: string): Promise<string | null> {
  // 1. Try to pull ChIJ... directly from the URL
  const fromUrl = extractPlaceIdFromUrl(link);
  if (fromUrl) return fromUrl;

  // 2. Short links (g.page, goo.gl, maps.app) — follow redirects using native fetch
  //    which reliably exposes the final URL via response.url
  if (link.includes("g.page") || link.includes("goo.gl") || link.includes("maps.app")) {
    try {
      const res = await fetch(link, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ReviewOptic/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      const fromRedirect = extractPlaceIdFromUrl(res.url);
      if (fromRedirect) return fromRedirect;
      const html = await res.text();
      const htmlMatch = html.match(/["'](ChIJ[A-Za-z0-9_%-]{10,})["']/);
      if (htmlMatch) return decodeURIComponent(htmlMatch[1]);
    } catch {}
  }

  return null;
}

// ── Platform fetchers ────────────────────────────────────────────────────────

async function fetchGoogle(accountId: string, link: string): Promise<FetchResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { reviews: [], error: "GOOGLE_PLACES_API_KEY not set in Secrets" };
  if (!link) return { reviews: [] };

  const placeId = await resolveGooglePlaceId(link, apiKey);
  if (!placeId) {
    const msg = `Could not resolve Place ID from link: ${link}`;
    console.warn(`[externalReviews] ${msg}`);
    return { reviews: [], error: msg };
  }

  try {
    const res = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
      params: { place_id: placeId, fields: "reviews", key: apiKey }, timeout: 10000,
    });
    if (res.data?.status && res.data.status !== "OK") {
      return { reviews: [], error: `Google API error: ${res.data.status}` };
    }
    const reviews = (res.data?.result?.reviews || [])
      .filter((r: any) => r.text?.trim())
      .map((r: any) => ({ author: r.author_name, rating: r.rating, text: r.text, date: r.time ? new Date(r.time * 1000) : null, platform: "google" }));
    console.log(`[externalReviews] Google: found ${reviews.length} reviews for Place ID ${placeId}`);
    return { reviews };
  } catch (err: any) {
    console.error(`[externalReviews] Google details error:`, err.message);
    return { reviews: [], error: err.message };
  }
}

type FetchResult = {reviews: ReviewItem[]; error?: string};

async function fetchFromPage(platform: string, url: string): Promise<FetchResult> {
  if (!url) return { reviews: [] };
  let html = "";
  try {
    const res = await axios.get(url, { headers: FETCH_HEADERS, timeout: 14000 });
    html = res.data as string;
  } catch (err: any) {
    console.error(`[externalReviews] ${platform} HTTP error:`, err.message);
    return { reviews: [], error: `Could not load page: ${err.message}` };
  }

  const reviews: ReviewItem[] = [];

  // 1. Try JSON-LD structured data
  const jsonLds = extractJsonLd(html);
  for (const ld of jsonLds) {
    const nodes: any[] = ld["@graph"] ? ld["@graph"] : [ld];
    for (const node of nodes) {
      const items: any[] = node.review || (node["@type"] === "Review" ? [node] : []);
      for (const r of items) {
        const text = (r.reviewBody || r.description || "").trim();
        const rating = Math.round(parseFloat(r.reviewRating?.ratingValue || r.starRating?.ratingValue || "0"));
        const author = r.author?.name || (typeof r.author === "string" ? r.author : "");
        const dateStr = r.datePublished || r.dateCreated || "";
        if (!text || !rating) continue;
        reviews.push({ author, rating, text, date: dateStr ? new Date(dateStr) : null, platform });
      }
    }
  }
  if (reviews.length > 0) {
    console.log(`[externalReviews] ${platform}: found ${reviews.length} reviews via JSON-LD`);
    return { reviews };
  }

  // 2. Try Next.js __NEXT_DATA__ (used by Checkatrade, some others)
  const nextDataReviews = extractFromNextData(html, platform);
  if (nextDataReviews.length > 0) {
    console.log(`[externalReviews] ${platform}: found ${nextDataReviews.length} reviews via __NEXT_DATA__`);
    return { reviews: nextDataReviews };
  }

  console.warn(`[externalReviews] ${platform}: no reviews found in JSON-LD or __NEXT_DATA__ at ${url}`);
  return { reviews: [], error: "No reviews found — page may use JavaScript rendering or block bots" };
}

async function fetchCheckatrade(accountId: string, link: string): Promise<FetchResult> {
  // Checkatrade profile URLs end with the trade name; reviews are on the same page
  const base = link.replace(/\/$/, "").replace(/\/reviews$/, "");
  const result = await fetchFromPage("checkatrade", base);
  if (result.reviews.length === 0) {
    // Also try the /reviews sub-page
    return fetchFromPage("checkatrade", base + "/reviews");
  }
  return result;
}

async function fetchTrustpilot(accountId: string, link: string): Promise<FetchResult> {
  return fetchFromPage("trustpilot", link);
}

async function fetchTripAdvisor(accountId: string, link: string): Promise<FetchResult> {
  return fetchFromPage("tripadvisor", link);
}

async function fetchMyBuilder(accountId: string, link: string): Promise<FetchResult> {
  return fetchFromPage("mybuilder", link);
}

async function fetchYell(accountId: string, link: string): Promise<FetchResult> {
  return fetchFromPage("yell", link);
}

// ── Auto-post logic ──────────────────────────────────────────────────────────

async function autoPostReview(accountId: string, review: {author: string; rating: number; text: string; platform: string}, settings: any): Promise<boolean> {
  if (!settings.social_post_enabled) return false;
  if (!settings.facebook_page_access_token || !settings.facebook_page_id) return false;
  // Only post 4 and 5 star reviews
  if (review.rating < 4) return false;

  // Cross-platform dedup: don't post the same text twice
  const alreadyPosted = await hasBeenPostedAlready(accountId, review.text);
  if (alreadyPosted) return false;

  const initials = review.author.trim().split(/\s+/).map((p: string) => p[0]?.toUpperCase() + ".").join(" ") || "A. C.";
  const caption = (settings.social_post_message || "⭐ We just received a {stars}★ review! Thank you {customer_name}!")
    .replace("{stars}", String(review.rating))
    .replace("{customer_name}", initials);

  try {
    await postCardToSocial({
      stars: review.rating,
      customerInitials: initials,
      businessName: settings.business_name,
      reviewText: review.text,
      platform: review.platform,
      cardTemplate: settings.social_card_template || "classic",
      caption,
      facebookPageAccessToken: settings.facebook_page_access_token,
      facebookPageId: settings.facebook_page_id,
      instagramBusinessAccountId: settings.instagram_business_account_id || undefined,
    });
    return true;
  } catch (err) {
    console.error("[externalReviews] Auto-post error:", err);
    return false;
  }
}

// ── Main polling function ────────────────────────────────────────────────────

export async function pollExternalReviewsForAccount(accountId: string): Promise<PlatformResult[]> {
  const { rows } = await pool.query(
    `SELECT google_review_link, checkatrade_link, trustpilot_link, tripadvisor_link,
            mybuilder_link, yell_link, social_post_enabled, facebook_page_access_token,
            facebook_page_id, instagram_business_account_id, business_name,
            social_card_template, social_post_message
     FROM settings WHERE account_id = $1`,
    [accountId]
  );
  if (!rows[0]) return [];
  const s = rows[0];

  // Check if this account has ever had reviews saved — if not, this is first-time seed.
  // First-time seed: save reviews but do NOT auto-post (they are not "new" reviews, just historic).
  const { rows: existing } = await pool.query(
    `SELECT COUNT(*) as count FROM external_reviews WHERE account_id = $1`, [accountId]
  );
  const isFirstPoll = parseInt(existing[0]?.count ?? "0") === 0;

  const platformConfigs: { platform: string; link: string; fetcher: () => Promise<FetchResult> }[] = [
    { platform: "google",      link: s.google_review_link,  fetcher: () => fetchGoogle(accountId, s.google_review_link) },
    { platform: "checkatrade", link: s.checkatrade_link,    fetcher: () => fetchCheckatrade(accountId, s.checkatrade_link) },
    { platform: "trustpilot",  link: s.trustpilot_link,     fetcher: () => fetchTrustpilot(accountId, s.trustpilot_link) },
    { platform: "tripadvisor", link: s.tripadvisor_link,    fetcher: () => fetchTripAdvisor(accountId, s.tripadvisor_link) },
    { platform: "mybuilder",   link: s.mybuilder_link,      fetcher: () => fetchMyBuilder(accountId, s.mybuilder_link) },
    { platform: "yell",        link: s.yell_link,           fetcher: () => fetchYell(accountId, s.yell_link) },
  ];

  const results: PlatformResult[] = [];

  const fetches = await Promise.all(
    platformConfigs.map(async (pc) => {
      if (!pc.link) return { platform: pc.platform, result: { reviews: [] as ReviewItem[] }, skipped: true };
      const result = await pc.fetcher().catch(err => ({ reviews: [] as ReviewItem[], error: String(err.message) }));
      return { platform: pc.platform, result, skipped: false };
    })
  );

  for (const { platform, result, skipped } of fetches) {
    if (skipped) {
      results.push({ platform, found: 0, saved: 0, skipped: true });
      continue;
    }
    let savedCount = 0;
    for (const review of result.reviews) {
      if (!review.text.trim()) continue;
      const key = reviewKey(review.platform, accountId, review.author, review.text);
      const isNew = await saveIfNew(accountId, review.platform, key, review.author, review.rating, review.text, review.date);
      if (isNew && !isFirstPoll) {
        const posted = await autoPostReview(accountId, review, s);
        if (posted) {
          await pool.query(
            `UPDATE external_reviews SET posted_to_social=true, posted_at=NOW()
             WHERE account_id=$1 AND platform=$2 AND external_id=$3`,
            [accountId, review.platform, key]
          );
          console.log(`[externalReviews] Auto-posted ${review.platform} review for account ${accountId}`);
        }
      }
      if (isNew) savedCount++;
    }
    results.push({ platform, found: result.reviews.length, saved: savedCount, skipped: false, error: result.error });
  }

  console.log(`[externalReviews] Poll complete for ${accountId}:`, results.map(r => `${r.platform}:${r.found}`).join(", "));
  return results;
}

export async function pollAllAccounts(): Promise<void> {
  const { rows } = await pool.query(`SELECT DISTINCT account_id FROM settings`);
  for (const row of rows) {
    await pollExternalReviewsForAccount(row.account_id).catch(err =>
      console.error(`[externalReviews] Poll failed for account ${row.account_id}:`, err)
    );
  }
}
