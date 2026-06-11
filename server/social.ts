import { generateReviewCard } from "./reviewCard";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "./cloudinary";
import { pool } from "./storage";

export interface SocialPostData {
  stars: number;
  customerInitials: string;
  businessName: string;
  reviewText?: string;
  platform?: string;
  cardTemplate?: string;
  caption: string;
  facebookPageAccessToken: string;
  facebookPageId: string;
  instagramBusinessAccountId?: string;
}

export async function postCardToSocial(data: SocialPostData): Promise<void> {
  let imageUrl = "";
  if (isCloudinaryConfigured()) {
    try {
      const cardBuffer = await generateReviewCard(
        data.stars,
        data.customerInitials,
        data.businessName,
        data.cardTemplate || "classic",
        data.reviewText || "",
        data.platform || ""
      );
      imageUrl = await uploadBufferToCloudinary(cardBuffer, "review-cards");
    } catch (err) {
      console.error("[social] Card generation error:", err);
    }
  }

  if (data.facebookPageAccessToken && data.facebookPageId) {
    try {
      if (imageUrl) {
        await fetch(`https://graph.facebook.com/v18.0/${data.facebookPageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: imageUrl, caption: data.caption, access_token: data.facebookPageAccessToken }),
        });
      } else {
        await fetch(`https://graph.facebook.com/v18.0/${data.facebookPageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: data.caption, access_token: data.facebookPageAccessToken }),
        });
      }
    } catch (err) {
      console.error("[social] Facebook post error:", err);
    }
  }

  if (imageUrl && data.facebookPageAccessToken && data.instagramBusinessAccountId) {
    try {
      const containerRes = await fetch(`https://graph.facebook.com/v18.0/${data.instagramBusinessAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, caption: data.caption, access_token: data.facebookPageAccessToken }),
      });
      const container = await containerRes.json() as any;
      if (container.id) {
        const publishRes = await fetch(`https://graph.facebook.com/v18.0/${data.instagramBusinessAccountId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: container.id, access_token: data.facebookPageAccessToken }),
        });
        const pub = await publishRes.json() as any;
        if (pub.error) console.error("[social] Instagram publish error:", JSON.stringify(pub.error));
      } else {
        console.error("[social] Instagram container error:", JSON.stringify(container));
      }
    } catch (err) {
      console.error("[social] Instagram post error:", err);
    }
  }
}

// Check if an identical review (same account, same normalised text) has already been posted to social.
// Prevents the same review appearing on multiple platforms from being posted twice.
export async function hasBeenPostedAlready(accountId: string, reviewText: string): Promise<boolean> {
  const normalised = reviewText.trim().toLowerCase().slice(0, 100);
  const { rows } = await pool.query(
    `SELECT id FROM external_reviews
     WHERE account_id = $1 AND posted_to_social = true
     AND LOWER(TRIM(review_text)) LIKE $2`,
    [accountId, `${normalised}%`]
  );
  return rows.length > 0;
}
