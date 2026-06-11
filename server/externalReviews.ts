import axios from "axios";
import { pool } from "./storage";
import { postCardToSocial, hasBeenPostedAlready } from "./social";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ReviewOptic/1.0; +https://reviewoptic.com)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
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

// Resolve any Google link to a Place ID — tries URL extraction first,
// then falls back to Places text search using the business name.
async function resolveGooglePlaceId(link: string, businessName: string, apiKey: string): Promise<string | null> {
  // 1. Try to pull ChIJ... directly from the URL
  const fromUrl = extractPlaceIdFromUrl(link);
  if (fromUrl) return fromUrl;

  // 2. g.page and other short links — follow the redirect to get the real URL
  if (link.includes("g.page") || link.includes("goo.gl") || link.includes("maps.app")) {
    try {
      const res = await axios.get(link, {
        maxRedirects: 8, timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" },
        validateStatus: () => true,
      });
      // Try to extract from the redirected URL stored in the request chain
      const finalUrl: string = (res.request as any)?._redirectable?._currentUrl
        || (res.request as any)?.res?.responseUrl
        || "";
      const fromRedirect = extractPlaceIdFromUrl(finalUrl);
      if (fromRedirect) return fromRedirect;
      // Also scan the page HTML for a Place ID
      const htmlMatch = (res.data as string)?.match?.(/["'](ChIJ[A-Za-z0-9_%-]{10,})["']/);
      if (htmlMatch) return decodeURIComponent(htmlMatch[1]);
    } catch {}
  }

  // 3. Last resort — search by business name via Places findplacefromtext
  if (businessName) {
    try {
      const res = await axios.get("https://maps.googleapis.com/maps/api/place/findplacefromtext/json", {
        params: { input: businessName, inputtype: "textquery", fields: "place_id", key: apiKey },
        timeout: 8000,
      });
      const placeId = res.data?.candidates?.[0]?.place_id;
      if (placeId) { console.log(`[externalReviews] Resolved Place ID via text search: ${placeId}`); return placeId; }
    } catch {}
  }

  return null;
}

// ── Platform fetchers ────────────────────────────────────────────────────────

async function fetchGoogle(accountId: string, link: string, businessName: string): Promise<{author: string; rating: number; text: string; date: Date|null; platform: string}[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !link) return [];

  const placeId = await resolveGooglePlaceId(link, businessName, apiKey);
  if (!placeId) {
    console.warn(`[externalReviews] Could not resolve Place ID for account ${accountId} — link: ${link}`);
    return [];
  }

  try {
    const res = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
      params: { place_id: placeId, fields: "reviews", key: apiKey }, timeout: 10000,
    });
    return (res.data?.result?.reviews || [])
      .filter((r: any) => r.text?.trim())
      .map((r: any) => ({ author: r.author_name, rating: r.rating, text: r.text, date: r.time ? new Date(r.time * 1000) : null, platform: "google" }));
  } catch (err: any) {
    console.error(`[externalReviews] Google details error:`, err.message);
    return [];
  }
}

async function fetchFromJsonLd(platform: string, url: string): Promise<{author: string; rating: number; text: string; date: Date|null; platform: string}[]> {
  if (!url) return [];
  try {
    const res = await axios.get(url, { headers: FETCH_HEADERS, timeout: 12000 });
    const jsonLds = extractJsonLd(res.data as string);
    const found: {author: string; rating: number; text: string; date: Date|null; platform: string}[] = [];

    for (const ld of jsonLds) {
      // Flatten @graph if present
      const nodes: any[] = ld["@graph"] ? ld["@graph"] : [ld];
      for (const node of nodes) {
        const reviews: any[] = node.review || (node["@type"] === "Review" ? [node] : []);
        for (const r of reviews) {
          const text = (r.reviewBody || r.description || "").trim();
          const rating = Math.round(parseFloat(r.reviewRating?.ratingValue || r.starRating?.ratingValue || "0"));
          const author = r.author?.name || (typeof r.author === "string" ? r.author : "");
          const dateStr = r.datePublished || r.dateCreated || "";
          if (!text || !rating) continue;
          found.push({ author, rating, text, date: dateStr ? new Date(dateStr) : null, platform });
        }
      }
    }
    return found;
  } catch (err: any) {
    console.error(`[externalReviews] ${platform} fetch error:`, err.message);
    return [];
  }
}

async function fetchCheckatrade(accountId: string, link: string) {
  const url = link.replace(/\/$/, "") + "/reviews";
  return fetchFromJsonLd("checkatrade", url);
}

async function fetchTrustpilot(accountId: string, link: string) {
  return fetchFromJsonLd("trustpilot", link);
}

async function fetchTripAdvisor(accountId: string, link: string) {
  return fetchFromJsonLd("tripadvisor", link);
}

async function fetchMyBuilder(accountId: string, link: string) {
  return fetchFromJsonLd("mybuilder", link);
}

async function fetchYell(accountId: string, link: string) {
  return fetchFromJsonLd("yell", link);
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

export async function pollExternalReviewsForAccount(accountId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT google_review_link, checkatrade_link, trustpilot_link, tripadvisor_link,
            mybuilder_link, yell_link, social_post_enabled, facebook_page_access_token,
            facebook_page_id, instagram_business_account_id, business_name,
            social_card_template, social_post_message
     FROM settings WHERE account_id = $1`,
    [accountId]
  );
  if (!rows[0]) return;
  const s = rows[0];

  // Fetch from all configured platforms
  const allReviews = (await Promise.all([
    s.google_review_link  ? fetchGoogle(accountId, s.google_review_link, s.business_name || "") : [],
    s.checkatrade_link    ? fetchCheckatrade(accountId, s.checkatrade_link) : [],
    s.trustpilot_link     ? fetchTrustpilot(accountId, s.trustpilot_link) : [],
    s.tripadvisor_link    ? fetchTripAdvisor(accountId, s.tripadvisor_link) : [],
    s.mybuilder_link      ? fetchMyBuilder(accountId, s.mybuilder_link) : [],
    s.yell_link           ? fetchYell(accountId, s.yell_link) : [],
  ])).flat();

  // Save new reviews and auto-post
  for (const review of allReviews) {
    if (!review.text.trim()) continue;
    const key = reviewKey(review.platform, accountId, review.author, review.text);
    const isNew = await saveIfNew(accountId, review.platform, key, review.author, review.rating, review.text, review.date);

    if (isNew) {
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
  }
}

export async function pollAllAccounts(): Promise<void> {
  const { rows } = await pool.query(`SELECT DISTINCT account_id FROM settings`);
  for (const row of rows) {
    await pollExternalReviewsForAccount(row.account_id).catch(err =>
      console.error(`[externalReviews] Poll failed for account ${row.account_id}:`, err)
    );
  }
}
