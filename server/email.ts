import { Resend } from "resend";
import fs from "fs";
import path from "path";
import type { Customer, Settings } from "@shared/schema";
import { getEmailTemplateOverride, getEffectiveTemplate, renderBodyHtml } from "./systemEmailTemplates";

const APP_URL = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");

// Embed logo as base64 so it displays in all email clients without external image blocking
function loadLogoBase64(): string {
  const candidates = [
    path.join(__dirname, "public", "logo.png"),           // production: dist/public/logo.png
    path.join(process.cwd(), "client", "public", "logo.png"), // development
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    } catch {}
  }
  return `${APP_URL}/logo.png`; // fallback to URL if file not found
}
const LOGO_SRC = loadLogoBase64();

export const REVIEWOPTIC_FROM = "Alicia & Rob - ReviewOptic <noreply@reviewoptic.com>";

function customerFrom(settings: Settings): string {
  const displayName = settings.ownerName
    ? `${settings.ownerName} - ${settings.businessName}`
    : settings.businessName;
  return `${displayName} <noreply@reviewoptic.com>`;
}

const LOGO_HTML = `<div style="margin-bottom:28px;text-align:center;">
  <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
    <img src="${LOGO_SRC}" alt="ReviewOptic" style="max-width:280px;width:100%;height:auto;display:block;" />
  </a>
</div>`;

function customerLogoHtml(settings: Settings): string {
  const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");
  const logoSrc = settings.logoUrl?.startsWith("http") ? settings.logoUrl : settings.logoUrl ? `${baseUrl}${settings.logoUrl}` : "";
  if (!logoSrc) return "";
  const websiteHref = settings.websiteUrl ? (settings.websiteUrl.startsWith("http") ? settings.websiteUrl : `https://${settings.websiteUrl}`) : "";
  const img = `<img src="${logoSrc}" alt="${settings.businessName}" style="width:100%;max-width:280px;height:auto;object-fit:contain;display:block;margin:0 auto;" />`;
  const linked = websiteHref ? `<a href="${websiteHref}" target="_blank" style="text-decoration:none;">${img}</a>` : img;
  return `<div style="margin-bottom:28px;text-align:center;">${linked}</div>`;
}
function customerFooter(customerId: string): string {
  const unsubUrl = `${APP_URL}/api/unsubscribe/customer?cid=${encodeURIComponent(customerId)}`;
  return `
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:20px;text-align:center;">
    <p style="font-size:11px;color:#9ca3af;margin:0 0 8px;">Powered by</p>
    <a href="${APP_URL}" style="text-decoration:none;display:inline-block;margin-bottom:14px;">
      <img src="${LOGO_SRC}" alt="ReviewOptic" style="width:100px;height:auto;display:block;" />
    </a>
    <p style="font-size:11px;color:#9ca3af;margin:0;">
      Don't want to receive emails like this?
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
    </p>
  </div>`;
}

const PLATFORM_FOOTER = `
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:24px;text-align:center;">
    <p style="font-size:13px;color:#555;margin:0 0 12px;text-align:center;">Know someone who could benefit from ReviewOptic?</p>
    <a href="https://reviewoptic.com/pricing" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">Refer a friend</a>
    <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;">
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0 0 8px;">Powered by <a href="https://reviewoptic.com" style="color:#9ca3af;text-decoration:underline;">ReviewOptic</a></p>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;">
        <a href="https://reviewoptic.com/privacy" style="font-size:11px;color:#9ca3af;text-decoration:underline;margin:0 8px;">Privacy Policy</a>
        &nbsp;&middot;&nbsp;
        <a href="https://reviewoptic.com/terms" style="font-size:11px;color:#9ca3af;text-decoration:underline;margin:0 8px;">Terms &amp; Conditions</a>
        &nbsp;&middot;&nbsp;
        <a href="https://reviewoptic.com/faq" style="font-size:11px;color:#9ca3af;text-decoration:underline;margin:0 8px;">FAQ</a>
      </p>
    </div>
  </div>`;

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[verify email] No RESEND_API_KEY - skipping");
    return;
  }
  const tmpl = await getEmailTemplateOverride("verification");
  const subject = tmpl?.subject || "Verify your email and choose your plan";
  const bodyHtml = tmpl?.body
    ? renderBodyHtml(tmpl.body)
    : `<p style="color:#555;margin:0 0 8px;line-height:1.6;">We're really happy to have you here. Just verify your email below to unlock your free trial and start building the reviews your business deserves.</p>
       <p style="color:#555;margin:0 0 24px;line-height:1.6;">It takes less than a minute — and your first 30 days are completely free.</p>`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Welcome — you're one step away! 👋</h2>
        ${bodyHtml}
        <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Verify email &amp; start free trial
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          If you didn't create a ReviewOptic account, you can safely ignore this email.
        </p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
  console.log(`[verify email] Resend result:`, JSON.stringify(result));
}

export async function sendTeamInviteEmail(to: string, inviterName: string, companyName: string, acceptUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[team invite] No RESEND_API_KEY. Invite link for ${to}: ${acceptUrl}`);
    return;
  }
  const tmpl = await getEmailTemplateOverride("team_invite");
  const subject = tmpl?.subject
    ? tmpl.subject.replace("{{company_name}}", companyName)
    : `You've been invited to join ${companyName} on ReviewOptic`;
  const bodyHtml = tmpl?.body
    ? renderBodyHtml(tmpl.body, { "{{inviter_name}}": inviterName, "{{company_name}}": companyName })
    : `<p style="color:#555;margin:0 0 8px;line-height:1.6;"><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on ReviewOptic — the platform that helps businesses collect more genuine reviews and grow their reputation online.</p>
       <p style="color:#555;margin:0 0 24px;line-height:1.6;">Click below to set your password and get started. We think you're going to love it.</p>`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to, subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">You're in — welcome to the team! 🎉</h2>
        ${bodyHtml}
        <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Accept invitation &amp; get started
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
  console.log(`[team invite] Sent to ${to}`);
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

function applyMergeTags(text: string, customer: Customer, settings: Settings, reviewLinkOverride?: string): string {
  const firstName = customer.name.split(" ")[0];
  return text
    .replace(/\{\{customer_name\}\}/g, customer.name)
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, settings.businessName)
    .replace(/\{\{service_type\}\}/g, customer.serviceType || "")
    .replace(/\{\{review_link\}\}/g, reviewLinkOverride || getReviewLink(settings));
}


function platformUnsubscribeFooter(userId: string): string {
  const unsubUrl = `${APP_URL}/api/unsubscribe/platform?uid=${encodeURIComponent(userId)}`;
  return `
  <div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:12px;">
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;">
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from ReviewOptic emails</a>
    </p>
  </div>`;
}

export async function sendReviewEmail(
  customer: Customer,
  settings: Settings,
  template?: { subject: string; body: string } | null,
  selectedPlatforms?: { name: string; url: string }[],
  subjectPrefix?: string
): Promise<void> {
  console.log(`[sendReviewEmail] called, hasKey=${!!process.env.RESEND_API_KEY}`);
  if (!customer.email) return;

  if (!process.env.RESEND_API_KEY) {
    console.log("[review request] No RESEND_API_KEY - skipping");
    return;
  }

  // Only show platform buttons if explicitly provided — no fallback button
  const platforms = selectedPlatforms?.length ? selectedPlatforms : [];
  const primaryLink = platforms[0]?.url || "";

  const logoHtml = customerLogoHtml(settings);

  const platformButtons = platforms.map(p =>
    `<a href="${p.url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px 4px 4px 0;">Review us on ${p.name}</a>`
  ).join("");

  let subject: string;
  let html: string;

  const defaultSubject = `How was your experience with ${settings.businessName}?`;
  const renderBodyParagraphs = (text: string) =>
    text.split(/\n\n+/).map(p => `<p style="color:#555;margin:0 0 16px;line-height:1.6;">${p.replace(/\n/g, "<br>")}</p>`).join("");

  if (template?.body) {
    subject = applyMergeTags(template.subject || defaultSubject, customer, settings, primaryLink);
    const bodyText = applyMergeTags(template.body, customer, settings, primaryLink);
    html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
      ${logoHtml}
      ${renderBodyParagraphs(bodyText)}
      ${platforms.length ? `<div style="text-align:center;margin:8px 0 0;">${platformButtons}</div>` : ""}
      ${customerFooter(customer.id)}
    </div>`;
  } else {
    const firstName = customer.name.split(" ")[0];
    subject = template?.subject || defaultSubject;
    html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
      ${logoHtml}
      <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Hi ${firstName},</h2>
      <p style="color:#555;margin:0 0 24px;line-height:1.6;">
        Thank you for choosing ${settings.businessName}. We'd love to hear about your experience — it only takes a minute and means a lot to us.
      </p>
      <div style="text-align:center;">${platformButtons}</div>
      ${customerFooter(customer.id)}
    </div>`;
  }

  if (subjectPrefix) subject = subjectPrefix + subject;
  console.log(`[sendReviewEmail] sending subject="${subject}"`);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: customerFrom(settings),
    replyTo: settings.businessEmail || undefined,
    to: customer.email,
    subject,
    html,
  });
  console.log(`[sendReviewEmail] result:`, JSON.stringify(result));
}

export async function sendPreScreenEmail(
  customer: Customer,
  settings: Settings,
  requestId: string,
  appUrl: string,
  subjectPrefix?: string
): Promise<void> {
  if (!customer.email) return;
  if (!process.env.RESEND_API_KEY) {
    console.log("[pre-screen email] No RESEND_API_KEY - skipping");
    return;
  }

  const firstName = customer.name.split(" ")[0];
  const logoHtml = customerLogoHtml(settings);
  const tmpl = await getEmailTemplateOverride("pre_screen");
  let subject = tmpl?.subject
    ? tmpl.subject.replace("{{business_name}}", settings.businessName)
    : `How would you rate your experience with ${settings.businessName}?`;
  if (subjectPrefix) subject = subjectPrefix + subject;
  const introHtml = tmpl?.body
    ? renderBodyHtml(tmpl.body, { "{{first_name}}": firstName, "{{business_name}}": settings.businessName })
    : `<p style="color:#555;margin:0 0 28px;line-height:1.6;">Thank you for choosing ${settings.businessName}! How would you rate your experience? Tap a star below:</p>`;

  const stars = [1, 2, 3, 4, 5].map(n =>
    `<td style="padding:0 6px;text-align:center;">
      <a href="${appUrl}/review-landing?rid=${requestId}&rating=${n}"
         style="display:inline-block;width:52px;height:52px;line-height:52px;text-align:center;font-size:42px;color:#f59e0b;text-decoration:none;font-family:Arial,sans-serif;">&#9733;</a>
      <div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:2px;">${n}</div>
    </td>`
  ).join("");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: customerFrom(settings),
    replyTo: settings.businessEmail || undefined,
    to: customer.email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
        ${logoHtml}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">Hi ${firstName},</h2>
        ${introHtml}
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 auto 24px;">
          <tr>${stars}</tr>
        </table>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0 0 32px;">Tap a star to submit your rating</p>
        ${customerFooter(customer.id)}
        <img src="${appUrl}/api/track/${requestId}/open" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />
      </div>
    `,
  });
  console.log(`[pre-screen email] result:`, JSON.stringify(result));
}

// Sent to ReviewOptic subscribers after 1 month — asks them to rate ReviewOptic with 1–5 stars.
// Uses the subscriber_review_request system template (editable in admin panel).
export async function sendSubscriberReviewRequestEmail(
  subscriber: { id: string; email: string; name: string; companyName: string },
  requestId: string,
  appUrl: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[subscriber review request] No RESEND_API_KEY - skipping");
    return;
  }
  const { getEffectiveTemplate, renderBodyHtml } = await import("./systemEmailTemplates");
  const tmpl = await getEffectiveTemplate("subscriber_review_request");
  const firstName = subscriber.name.split(" ")[0];
  const subject = tmpl.subject;
  const introHtml = renderBodyHtml(tmpl.body, {
    "{{first_name}}": firstName,
    "{{company_name}}": subscriber.companyName,
  });

  const stars = [1, 2, 3, 4, 5].map(n =>
    `<td style="padding:0 6px;text-align:center;">
      <a href="${appUrl}/review-landing?rid=${requestId}&rating=${n}"
         style="display:inline-block;width:52px;height:52px;line-height:52px;text-align:center;font-size:42px;color:#f59e0b;text-decoration:none;font-family:Arial,sans-serif;">&#9733;</a>
      <div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:2px;">${n}</div>
    </td>`
  ).join("");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to: subscriber.email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">Hi ${firstName},</h2>
        ${introHtml}
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 auto 24px;">
          <tr>${stars}</tr>
        </table>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0 0 32px;">Tap a star to submit your rating</p>
        ${PLATFORM_FOOTER}
        <img src="${appUrl}/api/track/${requestId}/open" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />
      </div>
    `,
  });
  console.log(`[subscriber review request] result:`, JSON.stringify(result));
}

// Sent as a follow-up to unrated customers — uses the follow-up template body + a "Rate your experience" button.
export async function sendFollowUpEmail(
  customer: Customer,
  settings: Settings,
  ratingLink: string,
  template?: { subject: string; body: string } | null,
  subjectPrefix?: string
): Promise<void> {
  if (!customer.email) return;
  if (!process.env.RESEND_API_KEY) {
    console.log("[follow-up email] No RESEND_API_KEY - skipping");
    return;
  }

  const firstName = customer.name.split(" ")[0];
  const logoHtml = customerLogoHtml(settings);

  const ownerFirstName = (settings.ownerName || "").split(" ")[0];
  const resolve = (text: string) => {
    let out = text
      .replace(/\{\{first_name\}\}/g, firstName)
      .replace(/\{\{customer_name\}\}/g, customer.name)
      .replace(/\{\{business_name\}\}/g, settings.businessName)
      .replace(/\{\{owner_name\}\}/g, ownerFirstName)
      .replace(/\{\{review_link\}\}/g, "");
    if (!customer.serviceType) {
      out = out.replace(/\s*and our \{\{service_type\}\}/gi, "").replace(/\{\{service_type\}\}/g, "");
    } else {
      out = out.replace(/\{\{service_type\}\}/g, customer.serviceType);
    }
    return out;
  };

  let subject = template?.subject
    ? resolve(template.subject)
    : `Just checking in — ${settings.businessName} would love your feedback`;
  if (subjectPrefix) subject = subjectPrefix + subject;
  const body = template?.body
    ? resolve(template.body)
    : `Just a quick follow-up from ${settings.businessName} — we'd love to hear how we did! Tap the button below to leave your rating.`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: customerFrom(settings),
    replyTo: settings.businessEmail || undefined,
    to: customer.email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
        ${logoHtml}
        ${body.split(/\n\n+/).map(p => `<p style="color:#555;margin:0 0 16px;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`).join("")}
        <div style="text-align:center;margin:8px 0 32px;">
          <a href="${ratingLink}" style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
            Rate your experience &rarr;
          </a>
        </div>
        ${customerFooter(customer.id)}
      </div>
    `,
  });
  console.log("[follow-up email] sent");
}

export async function sendPlatformReviewRequest(user: { id: string; email: string; firstName: string; companyName: string }, isFollowUp: boolean) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[platform review request] No RESEND_API_KEY - skipping");
    return;
  }

  const googleUrl = process.env.PLATFORM_REVIEW_GOOGLE_URL || "https://g.page/r/reviewoptic/review";
  const trustpilotUrl = process.env.PLATFORM_REVIEW_TRUSTPILOT_URL || "";
  const videoUrl = process.env.PLATFORM_REVIEW_VIDEO_URL || "";

  const videoHtml = videoUrl ? `
    <div style="margin:24px 0;text-align:center;">
      <a href="${videoUrl}" target="_blank" style="display:inline-block;position:relative;text-decoration:none;">
        <div style="background:#000;border-radius:12px;overflow:hidden;width:480px;max-width:100%;position:relative;">
          <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);height:200px;display:flex;align-items:center;justify-content:center;">
            <div style="width:56px;height:56px;background:rgba(255,255,255,0.95);border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <div style="width:0;height:0;border-style:solid;border-width:10px 0 10px 18px;border-color:transparent transparent transparent #1e40af;margin-left:4px;"></div>
            </div>
          </div>
          <div style="background:#1e3a5f;color:#fff;padding:12px 16px;font-size:13px;font-family:Arial,sans-serif;">
            Watch: a quick message from Alicia &amp; Rob
          </div>
        </div>
      </a>
    </div>` : "";

  const platformLinks = [
    { name: "Google", url: googleUrl },
    ...(trustpilotUrl ? [{ name: "Trustpilot", url: trustpilotUrl }] : []),
  ].map(p =>
    `<a href="${p.url}" target="_blank" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;font-family:Arial,sans-serif;margin:4px;">${p.name}</a>`
  ).join("");

  const subjectLine = isFollowUp
    ? `A quick reminder — would you mind leaving us a review?`
    : `How are you finding ReviewOptic? We'd love your feedback`;

  const intro = isFollowUp
    ? `<p style="color:#555;margin:0 0 16px;line-height:1.6;">We wanted to follow up on our earlier message — if you've had a chance to try ReviewOptic, we'd really love to hear what you think.</p>`
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">You've been using ReviewOptic for a little while now, and we hope it's been making a real difference for ${user.companyName}.</p>
       <p style="color:#555;margin:0 0 16px;line-height:1.6;">We're a small team and honest reviews help us grow so we can keep improving the product for businesses like yours. If you've got 60 seconds, we'd be incredibly grateful if you could share your experience:</p>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to: user.email,
    subject: subjectLine,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Hi ${user.firstName},</h2>
        ${intro}
        ${videoHtml}
        <div style="text-align:center;margin:28px 0;">
          ${platformLinks}
        </div>
        <p style="color:#999;font-size:12px;line-height:1.6;margin-top:32px;">
          You're receiving this because you have an account with ReviewOptic.
        </p>
        ${PLATFORM_FOOTER}
        ${platformUnsubscribeFooter(user.id)}
      </div>
    `,
  });
  console.log(`[platform review request] sent (followUp=${isFollowUp})`);
}

export async function sendCancellationEmail(to: string, firstName: string, accessEndsDate: string, reactivateUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[cancellation email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const tmplC = await getEmailTemplateOverride("cancellation");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subjectC = tmplC?.subject?.replace("{{first_name}}", firstName || "") || "Your ReviewOptic subscription has been cancelled";
  const bodyHtmlC = tmplC?.body
    ? renderBodyHtml(tmplC.body, { "{{first_name}}": firstName || "", "{{access_ends}}": accessEndsDate })
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">Your cancellation is confirmed. You'll still have <strong>full access to all features</strong> until <strong>${accessEndsDate}</strong> — so keep making the most of it until then.</p>
       <p style="color:#555;margin:0 0 16px;line-height:1.6;">After ${accessEndsDate}, you'll still be able to log in and view your analytics — but you won't be able to add new customers or send review requests.</p>
       <p style="color:#555;margin:0 0 16px;line-height:1.6;">Your account and all your data will be kept safe. If you ever want to reactivate, you're always welcome back — one click is all it takes.</p>
       <p style="color:#555;margin:0 0 8px;line-height:1.6;">We're always looking to improve — if there's anything we could have done better, we'd genuinely love to hear it. Just hit reply.</p>
       <p style="color:#555;margin:0;line-height:1.6;">Thank you for trusting us with your business. It's meant a lot to us. 🙏</p>`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to,
    subject: subjectC,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">We're sad to see you go${firstName ? `, ${firstName}` : ""} 💙</h2>
        ${bodyHtmlC}
        <a href="${reactivateUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0 24px;">
          Reactivate my subscription
        </a>
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendSubscriptionEndedEmail(to: string, firstName: string, reactivateUrl: string, accessEndedDate?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[subscription-ended email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const tmplSE = await getEmailTemplateOverride("subscription_ended");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subjectSE = tmplSE?.subject?.replace("{{first_name}}", firstName || "") || "Your ReviewOptic subscription has ended";
  const bodyHtmlSE = tmplSE?.body
    ? renderBodyHtml(tmplSE.body, { "{{first_name}}": firstName || "", "{{access_ended}}": accessEndedDate || "today" })
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">Your ReviewOptic subscription ended ${accessEndedDate ? `on <strong>${accessEndedDate}</strong>` : "today"} and billing has stopped. You won't be charged again. ✅</p>
       <p style="color:#555;margin:0 0 16px;line-height:1.6;">You can still log in and view your analytics — but you won't be able to add new customers or send review requests. Your account data will be kept safe for 30 days.</p>
       <p style="color:#555;margin:0 0 8px;line-height:1.6;">We hope ReviewOptic made a difference while you were with us. If there's anything we could have done better, we'd genuinely love to know — just hit reply.</p>
       <p style="color:#555;margin:0;line-height:1.6;">Thank you for being part of ReviewOptic. The door is always open. 🙏</p>`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to,
    subject: subjectSE,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Your subscription has now ended${firstName ? `, ${firstName}` : ""}</h2>
        ${bodyHtmlSE}
        <a href="${reactivateUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0 24px;">
          Reactivate my account
        </a>
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendAccountDeletionEmail(to: string, firstName: string, purgeDate: string, reactivateUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[account deletion email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const tmplAD = await getEmailTemplateOverride("account_deletion");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subjectAD = tmplAD?.subject?.replace("{{first_name}}", firstName || "") || "Your ReviewOptic account has been deleted";
  const bodyHtmlAD = tmplAD?.body
    ? renderBodyHtml(tmplAD.body, { "{{first_name}}": firstName || "", "{{purge_date}}": purgeDate })
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">As requested, your ReviewOptic account has been deleted. All your data will be permanently removed on <strong>${purgeDate}</strong>.</p>
       <p style="color:#555;margin:0 0 20px;line-height:1.6;">Changed your mind? You can reactivate at any time before ${purgeDate} and everything will be restored.</p>
       <p style="color:#555;margin:0 0 8px;line-height:1.6;">After ${purgeDate} your data cannot be recovered. If you have any questions, just hit reply.</p>
       <p style="color:#555;margin:0;line-height:1.6;">Thank you for using ReviewOptic. We hope to see you again. 🙏</p>`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to,
    subject: subjectAD,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Your account has been deleted${firstName ? `, ${firstName}` : ""}</h2>
        ${bodyHtmlAD}
        <a href="${reactivateUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0 24px;">
          Reactivate my account
        </a>
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendSubscriptionConfirmationEmail(
  to: string, firstName: string, planName: string, billingPeriod: string,
  amountPaid: string, nextBillingDate: string, invoiceUrl: string, billingUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[subscription confirmation] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const tmplSC = await getEmailTemplateOverride("subscription_confirmation");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subjectSC = tmplSC?.subject?.replace("{{first_name}}", firstName || "") || "Your ReviewOptic subscription is now active";
  const bodyHtmlSC = tmplSC?.body
    ? renderBodyHtml(tmplSC.body, { "{{first_name}}": firstName || "" })
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">We're so glad you enjoyed your free trial — and we're even more excited to see what you'll achieve from here.</p>
       <p style="color:#555;margin:0 0 24px;line-height:1.6;">Your ReviewOptic subscription is now active. Businesses that stay consistent with review requests typically see their ratings grow within the first 30 days. Keep sending, keep following up, and let ReviewOptic do the heavy lifting.</p>`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to,
    subject: subjectSC,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Welcome to the team${firstName ? `, ${firstName}` : ""}! 🎉</h2>
        ${bodyHtmlSC}
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Your subscription</p>
          <p style="margin:0 0 8px;font-size:13px;color:#555;"><strong style="color:#111;">Plan:</strong> ReviewOptic ${planName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#555;"><strong style="color:#111;">Billing:</strong> ${billingPeriod === "annual" ? "Annual" : "Monthly"}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#555;"><strong style="color:#111;">Amount charged:</strong> ${amountPaid}</p>
          ${nextBillingDate ? `<p style="margin:0;font-size:13px;color:#555;"><strong style="color:#111;">Next billing date:</strong> ${nextBillingDate}</p>` : ""}
        </div>
        ${invoiceUrl ? `<a href="${invoiceUrl}" style="display:inline-block;background:#f3f4f6;color:#111;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin-bottom:24px;border:1px solid #e5e7eb;">View receipt →</a>` : ""}
        <p style="color:#555;margin:0 0 16px;line-height:1.6;">You can manage your subscription, switch plans, or cancel at any time from your billing settings.</p>
        <a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">Manage billing</a>
        <p style="color:#555;margin:0 0 8px;line-height:1.6;">If you have any questions, just reply to this email — we're always happy to help.</p>
        <p style="color:#999;font-size:12px;margin-top:32px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendRatingNotificationEmail(
  to: string,
  customerName: string,
  rating: number,
  businessName: string,
  appUrl: string
) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const stars = "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
  const tmpl = await getEmailTemplateOverride("rating_notification");
  const ratingPlural = rating === 1 ? "" : "s";
  const subject = tmpl?.subject
    ? tmpl.subject.replace("{{customer_name}}", customerName).replace("{{rating}}", String(rating))
    : rating >= 4
      ? `${customerName} left you a ${rating}-star rating ${stars}`
      : `${customerName} left private feedback (${rating} star${ratingPlural})`;
  const bodyHtml = tmpl?.body
    ? renderBodyHtml(tmpl.body, { "{{customer_name}}": customerName, "{{business_name}}": businessName, "{{rating}}": String(rating), "{{rating_plural}}": ratingPlural })
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;"><strong style="color:#111;">${customerName}</strong> rated ${businessName} <strong style="color:#111;">${rating} star${ratingPlural}</strong> ${stars}</p>
       ${rating < 4 ? `<p style="color:#555;margin:0 0 16px;line-height:1.6;">They have left private feedback — log in to read it and respond.</p>` : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">Head to your customers page to see the details.</p>`}`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">New rating received</h2>
        ${bodyHtml}
        <a href="${appUrl}/customers" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">
          View in ReviewOptic
        </a>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendRenewalReminderEmail(to: string, firstName: string, planName: string, renewalDate: string, amount: string, billingUrl: string) {
  if (!process.env.RESEND_API_KEY) return;
  const tmpl = await getEmailTemplateOverride("renewal_reminder");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = tmpl?.subject || "Your ReviewOptic subscription renews in 7 days";
  const bodyHtml = tmpl?.body
    ? renderBodyHtml(tmpl.body, { "{{first_name}}": firstName, "{{plan_name}}": planName, "{{renewal_date}}": renewalDate, "{{amount}}": amount })
    : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">Just a heads-up — your <strong style="color:#111;">${planName}</strong> subscription will automatically renew in 3 days on <strong style="color:#111;">${renewalDate}</strong> for <strong style="color:#111;">${amount}</strong>.</p>
       <p style="color:#555;margin:0 0 20px;line-height:1.6;">No action needed. If you'd like to make any changes to your plan or payment details, you can do so from your billing settings.</p>`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Renewal reminder${firstName ? ` — hi ${firstName}` : ""}</h2>
        ${bodyHtml}
        <a href="${billingUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0 24px;">
          Manage billing
        </a>
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendPaymentFailedEmail(to: string, firstName: string, billingUrl: string, attemptCount = 1) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[payment-failed email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const tmpl = await getEmailTemplateOverride("payment_failed");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const isFinal = attemptCount >= 2;
  const subject = tmpl?.subject
    ? tmpl.subject
    : isFinal
      ? "Final notice: your ReviewOptic payment has failed — account will be cancelled"
      : "Action required: your ReviewOptic payment failed";
  const bodyHtml = tmpl?.body
    ? renderBodyHtml(tmpl.body, { "{{first_name}}": firstName || "" })
    : isFinal
      ? `<p style="color:#555;margin:0 0 16px;line-height:1.6;">We've tried to take your payment again but it has failed a second time. <strong style="color:#111;">Your subscription will be cancelled shortly</strong> if this isn't resolved.</p>
         <p style="color:#555;margin:0 0 20px;line-height:1.6;">You can retry with your existing card or update your payment details below. Your account data will be kept safe.</p>`
      : `<p style="color:#555;margin:0 0 16px;line-height:1.6;">We weren't able to take your latest payment. This can happen if your card has expired or your details have changed.</p>
         <p style="color:#555;margin:0 0 20px;line-height:1.6;">To avoid interruption to your service, please update your payment details or retry below. We'll try again automatically in 24 hours.</p>`;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM, to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Payment failed${firstName ? ` — hi ${firstName}` : ""}</h2>
        ${bodyHtml}
        <a href="${billingUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0 12px;">
          Retry payment now
        </a>
        <p style="margin:0 0 24px;"><a href="${billingUrl}" style="color:#2563eb;font-size:14px;text-decoration:underline;">Or update your card details</a></p>
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendIncompleteRegistrationEmail(to: string, firstName: string, registerUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[incomplete-registration email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const name = firstName ? `, ${firstName}` : "";
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject: "Did you mean to sign up for ReviewOptic?",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">We noticed you didn't finish signing up${name} 👋</h2>
        <p style="color:#555;margin:0 0 16px;line-height:1.6;">You started creating a ReviewOptic account but didn't complete the sign-up process — so your account has been removed to keep things tidy.</p>
        <p style="color:#555;margin:0 0 16px;line-height:1.6;">If you'd still like to get more Google reviews on autopilot, it only takes a couple of minutes to get started. Your 30-day free trial is waiting.</p>
        <a href="${registerUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:8px 0 24px;">
          Complete my sign-up
        </a>
        <p style="color:#555;margin:0 0 8px;line-height:1.6;">If you have any questions before signing up, just reply to this email — we're happy to help.</p>
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendReferralRewardEmail(to: string, firstName: string, creditAmount: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[referral-reward email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { subject, body } = await getEffectiveTemplate("referral_reward");
  const bodyHtml = renderBodyHtml(body, { "{{first_name}}": firstName || "there", "{{credit_amount}}": creditAmount });
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
        ${LOGO_HTML}
        ${bodyHtml}
        <p style="color:#999;font-size:12px;margin-top:16px;">Alicia &amp; Rob — ReviewOptic</p>
        ${PLATFORM_FOOTER}
      </div>
    `,
  });
}

export async function sendAdminNewUserEmail(firstName: string, lastName: string, email: string, companyName: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to: "hello@reviewoptic.com",
    subject: `New sign-up: ${name}${companyName ? ` (${companyName})` : ""}`,
    html: `<p>A new user has registered on ReviewOptic.</p>
<ul>
  <li><strong>Name:</strong> ${name}</li>
  <li><strong>Email:</strong> ${email}</li>
  ${companyName ? `<li><strong>Company:</strong> ${companyName}</li>` : ""}
</ul>`,
  }).catch((err: any) => console.error("[admin-new-user email] Failed:", err.message));
}
