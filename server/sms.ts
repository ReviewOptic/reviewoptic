import twilio from "twilio";
import type { Customer, Settings } from "@shared/schema";

function isUKNumber(phone: string): boolean {
  const clean = phone.replace(/\s+/g, "");
  return clean.startsWith("+44") || clean.startsWith("07");
}

export function normaliseUKNumber(phone: string): string {
  const clean = phone.replace(/\s+/g, "");
  if (clean.startsWith("07")) return "+44" + clean.slice(1);
  return clean;
}

// Alphanumeric sender IDs: max 11 chars, letters/numbers only
export function buildSenderId(businessName: string): string {
  return businessName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) || "ReviewOptic";
}

function applyMergeTags(text: string, customer: Customer, settings: Settings, reviewLinkOverride?: string): string {
  const firstName = customer.name.split(" ")[0];
  const reviewLink =
    settings.googleReviewLink ||
    settings.facebookReviewLink ||
    settings.trustpilotLink ||
    settings.tripadvisorLink ||
    settings.checkatradeLink ||
    settings.mybuilderLink ||
    "";
  return text
    .replace(/\{\{customer_name\}\}/g, customer.name)
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, settings.businessName)
    .replace(/\{\{service_type\}\}/g, customer.serviceType || "")
    .replace(/\{\{review_link\}\}/g, reviewLinkOverride || reviewLink);
}

export async function sendReviewSMS(
  customer: Customer,
  settings: Settings,
  template?: { body: string } | null,
  selectedPlatforms?: { name: string; url: string }[]
): Promise<void> {
  if (!customer.phone) return;

  if (!isUKNumber(customer.phone)) {
    console.log(`[sms] Skipping non-UK number for ${customer.name}`);
    return;
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[sms] No Twilio credentials. Would SMS ${customer.phone}`);
    return;
  }

  const reviewLink = selectedPlatforms?.[0]?.url ||
    settings.googleReviewLink ||
    settings.facebookReviewLink ||
    settings.trustpilotLink ||
    settings.tripadvisorLink ||
    settings.checkatradeLink ||
    settings.mybuilderLink ||
    "";

  const rawBody = template?.body
    ? applyMergeTags(template.body, customer, settings, reviewLink)
    : `Hi ${customer.name.split(" ")[0]}, thanks for choosing ${settings.businessName}! We'd love a quick review: ${reviewLink}`;

  const token = customer.id.split('-')[0];
  const body = rawBody + `\nStop: reviewoptic.com/u/${token}`;

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: "ReviewOptic",
    to: normaliseUKNumber(customer.phone),
    body,
  });
}

export async function sendWhatsAppMessage(
  phone: string,
  body: string,
  mediaUrl?: string
): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[whatsapp] No Twilio credentials. Would WhatsApp ${phone}`);
    return;
  }
  if (!process.env.TWILIO_WHATSAPP_FROM) {
    console.log(`[whatsapp] No TWILIO_WHATSAPP_FROM set. Would WhatsApp ${phone}`);
    return;
  }

  const normPhone = phone.replace(/\s+/g, "");
  const to = normPhone.startsWith("+") ? normPhone : `+44${normPhone.slice(1)}`;

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${to}`,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

export async function sendPlainSMS(phone: string, body: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[sms] No Twilio credentials. Would SMS ${phone}`);
    return;
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: "ReviewOptic",
    to: normaliseUKNumber(phone),
    body,
  });
}
