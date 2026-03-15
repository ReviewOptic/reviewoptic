import { Resend } from "resend";
import type { Customer, Settings } from "@shared/schema";

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[verify email] No RESEND_API_KEY. Verify link for ${to}: ${verifyUrl}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "ReviewOptic <hello@reviewoptic.com>",
    to,
    subject: "Verify your ReviewOptic email",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        <div style="margin-bottom:24px;">
          <span style="font-weight:700;font-size:18px;">ReviewOptic</span>
        </div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Verify your email address</h2>
        <p style="color:#555;margin:0 0 24px;line-height:1.6;">
          Thanks for signing up! Click the button below to verify your email and activate your account.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Verify my email
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          If you didn't create a ReviewOptic account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

function getReviewLink(settings: Settings): string {
  return (
    settings.googleReviewLink ||
    settings.facebookReviewLink ||
    settings.trustpilotLink ||
    settings.tripadvisorLink ||
    settings.checkatradeLink ||
    settings.mybuilderLink ||
    ""
  );
}

function applyMergeTags(text: string, customer: Customer, settings: Settings): string {
  const firstName = customer.name.split(" ")[0];
  return text
    .replace(/\{\{customer_name\}\}/g, customer.name)
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, settings.businessName)
    .replace(/\{\{service_type\}\}/g, customer.serviceType || "")
    .replace(/\{\{review_link\}\}/g, getReviewLink(settings));
}

export async function sendReviewEmail(
  customer: Customer,
  settings: Settings,
  template?: { subject: string; body: string } | null
): Promise<void> {
  if (!customer.email) return;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[review request] No RESEND_API_KEY. Would email ${customer.email}`);
    return;
  }

  const reviewLink = getReviewLink(settings);
  let subject: string;
  let html: string;

  if (template?.body) {
    subject = applyMergeTags(
      template.subject || `How was your experience with ${settings.businessName}?`,
      customer,
      settings
    );
    const bodyText = applyMergeTags(template.body, customer, settings);
    html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
      ${bodyText.replace(/\n/g, "<br>")}
      ${reviewLink ? `<br><br><a href="${reviewLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Leave a Review</a>` : ""}
    </div>`;
  } else {
    const firstName = customer.name.split(" ")[0];
    subject = `How was your experience with ${settings.businessName}?`;
    html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
      <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Hi ${firstName},</h2>
      <p style="color:#555;margin:0 0 24px;line-height:1.6;">
        Thank you for choosing ${settings.businessName}. We'd love to hear about your experience — it only takes a minute and means a lot to us.
      </p>
      ${reviewLink ? `<a href="${reviewLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Leave a Review</a>` : ""}
      <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
        If you'd prefer not to receive emails like this, please let us know.
      </p>
    </div>`;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: `${settings.businessName} <hello@reviewoptic.com>`,
    to: customer.email,
    subject,
    html,
  });
}
