import { pool } from "./storage";

export interface EmailTemplateOverride {
  subject: string;
  body: string;
}

// Default subject + body (plain text, \n\n = paragraph break) for every system email.
// Body text is injected into the standard HTML wrapper — dynamic parts (buttons, tables) are added by code.
export const DEFAULT_EMAIL_TEMPLATES: Record<string, { subject: string; body: string; variables: string[]; description: string }> = {
  verification: {
    subject: "Verify your email and choose your plan",
    body: "We're really happy to have you here. Just verify your email below to unlock your free trial and start building the reviews your business deserves.\n\nIt takes less than a minute — and your first 30 days are completely free.",
    variables: [],
    description: "Sent when a new user signs up",
  },
  reset: {
    subject: "Reset your ReviewOptic password",
    body: "We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.",
    variables: [],
    description: "Sent when a user requests a password reset",
  },
  team_invite: {
    subject: "You've been invited to join {{company_name}} on ReviewOptic",
    body: "{{inviter_name}} has invited you to join {{company_name}} on ReviewOptic — the platform that helps businesses collect more genuine reviews and grow their reputation online.\n\nClick below to set your password and get started. We think you're going to love it.",
    variables: ["{{inviter_name}}", "{{company_name}}"],
    description: "Sent when a team member is invited",
  },
  pre_screen: {
    subject: "How would you rate your experience with {{business_name}}?",
    body: "Thank you for choosing {{business_name}}! How would you rate your experience? Tap a star below:",
    variables: ["{{first_name}}", "{{business_name}}"],
    description: "Sent to customers asking them to tap a star rating",
  },
  rating_notification: {
    subject: "{{customer_name}} left you a {{rating}}-star rating",
    body: "{{customer_name}} rated {{business_name}} {{rating}} star{{rating_plural}}.\n\nHead to your customers page to see the details.",
    variables: ["{{customer_name}}", "{{business_name}}", "{{rating}}", "{{rating_plural}}"],
    description: "Sent to you when a customer submits a star rating",
  },
  private_feedback: {
    subject: "Private feedback received from {{customer_name}}",
    body: "{{customer_name}} rated their experience and left private feedback. Log in to read it and respond.",
    variables: ["{{customer_name}}", "{{business_name}}"],
    description: "Sent to you when a customer leaves private negative feedback",
  },
  subscription_confirmation: {
    subject: "Your ReviewOptic subscription is now active",
    body: "We're so glad you enjoyed your free trial — and we're even more excited to see what you'll achieve from here.\n\nYour ReviewOptic subscription is now active. This is just the start — businesses that stay consistent with review requests typically see their ratings grow within the first 30 days. Keep sending, keep following up, and let ReviewOptic do the heavy lifting.",
    variables: ["{{first_name}}"],
    description: "Sent when a subscription payment goes through",
  },
  cancellation: {
    subject: "Your ReviewOptic subscription has been cancelled",
    body: "Your cancellation is confirmed. You'll still have full access to all features until {{access_ends}} — so keep making the most of it until then.\n\nAfter {{access_ends}}, you'll still be able to log in and view your analytics — but you won't be able to add new customers or send review requests.\n\nYour account and all your data will be kept safe. If you ever want to reactivate, you're always welcome back — one click is all it takes.\n\nWe're always looking to improve — if there's anything we could have done better, or if something didn't work the way you hoped, we'd genuinely love to hear it. Just hit reply.\n\nThank you for trusting us with your business. It's meant a lot to us. 🙏",
    variables: ["{{first_name}}", "{{access_ends}}"],
    description: "Sent when a user cancels their subscription",
  },
  subscription_ended: {
    subject: "Your ReviewOptic subscription has ended",
    body: "Your ReviewOptic subscription ended {{access_ended}} and billing has stopped. You won't be charged again. ✅\n\nYou can still log in and view your analytics — but you won't be able to add new customers or send review requests. Your account data will be kept safe for 30 days.\n\nWe hope ReviewOptic made a difference while you were with us. If there's anything we could have done better, we'd genuinely love to know — just hit reply.\n\nThank you for being part of ReviewOptic. The door is always open. 🙏",
    variables: ["{{first_name}}", "{{access_ended}}"],
    description: "Sent when a user's access period expires after cancellation",
  },
  account_deletion: {
    subject: "Your ReviewOptic account has been deleted",
    body: "As requested, your ReviewOptic account has been deleted. All your data — customers, review requests, templates, analytics, and team members — will be permanently and irreversibly removed on {{purge_date}}.\n\nChanged your mind? You can reactivate your account at any time before {{purge_date}} and everything will be restored exactly as you left it.",
    variables: ["{{first_name}}", "{{purge_date}}"],
    description: "Sent when a user deletes their account",
  },
  insight: {
    subject: "Your {{frequency}} review report — {{month}}",
    body: "Here's how {{business_name}} is performing this period.",
    variables: ["{{business_name}}", "{{frequency}}", "{{month}}"],
    description: "Sent weekly or monthly with review stats and AI insights",
  },
  platform_review: {
    subject: "How are you finding ReviewOptic? We'd love your feedback",
    body: "You've been using ReviewOptic for a little while now, and we hope it's been making a real difference for {{company_name}}.\n\nWe're a small team and honest reviews help us grow so we can keep improving the product for businesses like yours. If you've got 60 seconds, we'd be incredibly grateful if you could share your experience:",
    variables: ["{{first_name}}", "{{company_name}}"],
    description: "Sent to users asking them to review ReviewOptic on Google",
  },
  renewal_reminder: {
    subject: "Your ReviewOptic subscription renews in 3 days",
    body: "Just a heads-up — your {{plan_name}} subscription will automatically renew in 3 days on {{renewal_date}} for {{amount}}.\n\nNo action needed. If you'd like to make any changes to your plan or payment details, you can do so from your billing settings.",
    variables: ["{{first_name}}", "{{plan_name}}", "{{renewal_date}}", "{{amount}}"],
    description: "Sent 1 day before a subscription renewal",
  },
  payment_failed: {
    subject: "Action required: your ReviewOptic payment failed",
    body: "We weren't able to take your latest payment. This can happen if your card has expired or your details have changed.\n\nTo avoid interruption to your service, please update your payment details as soon as possible.",
    variables: ["{{first_name}}"],
    description: "Sent when a subscription payment fails",
  },
  dialog_positive: {
    subject: "Thanks for the rating!",
    body: "Would you please take a couple of moments to leave us a review?",
    variables: [],
    description: "Post-rating dialogue box shown after a 4–5★ rating",
  },
  dialog_negative: {
    subject: "Sorry to hear you did not have the experience you expected",
    body: "We would appreciate your feedback on how we can improve for next time and will be in touch.",
    variables: [],
    description: "Post-rating dialogue box shown after a 1–3★ rating",
  },
};

// Fetch a custom override from the DB. Returns null if not customised.
export async function getEmailTemplateOverride(type: string): Promise<EmailTemplateOverride | null> {
  try {
    const { rows } = await pool.query(
      `SELECT subject, body FROM system_email_templates WHERE type = $1`, [type]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

// Returns the effective template: DB override if set, otherwise the hardcoded default.
export async function getEffectiveTemplate(type: string): Promise<{ subject: string; body: string }> {
  const override = await getEmailTemplateOverride(type);
  if (override) return override;
  const def = DEFAULT_EMAIL_TEMPLATES[type];
  return { subject: def?.subject || "", body: def?.body || "" };
}

// Convert plain text body (with \n\n paragraph breaks and {{vars}}) to styled HTML paragraphs.
export function renderBodyHtml(text: string, vars: Record<string, string> = {}): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(k, v);
  }
  return out
    .split("\n\n")
    .map(p => `<p style="color:#555;margin:0 0 16px;line-height:1.6;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
