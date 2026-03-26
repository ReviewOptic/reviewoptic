import { Resend } from "resend";
import type { Customer, Settings } from "@shared/schema";

const APP_URL = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://reviewoptic.com");

export const REVIEWOPTIC_FROM = "Alicia & Rob - ReviewOptic <noreply@reviewoptic.com>";

function customerFrom(settings: Settings): string {
  const displayName = settings.ownerName
    ? `${settings.ownerName} - ${settings.businessName}`
    : settings.businessName;
  return `${displayName} <noreply@reviewoptic.com>`;
}
const LOGO_URL = `${APP_URL}/logo.png`;
const LOGO_HTML = `<div style="margin-bottom:28px;">
  <a href="https://reviewoptic.com" style="text-decoration:none;">
    <img src="${LOGO_URL}" alt="ReviewOptic" style="height:36px;max-width:180px;object-fit:contain;display:block;" />
  </a>
</div>`;
const POWERED_BY_FOOTER = `
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;text-align:center;">
    <a href="https://reviewoptic.com" style="text-decoration:none;">
      <img src="${LOGO_URL}" alt="ReviewOptic" style="height:24px;max-width:120px;object-fit:contain;display:inline-block;vertical-align:middle;margin-right:6px;" />
    </a>
    <span style="font-size:11px;color:#9ca3af;vertical-align:middle;">Powered by <a href="https://reviewoptic.com" style="color:#9ca3af;">ReviewOptic</a></span>
  </div>`;

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[verify email] No RESEND_API_KEY. Verify link for ${to}: ${verifyUrl}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject: "Verify your email and choose your plan",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">You're almost there!</h2>
        <p style="color:#555;margin:0 0 8px;line-height:1.6;">
          Thanks for signing up! Click the button below to verify your email and choose your plan to get started.
        </p>
        <p style="color:#555;margin:0 0 24px;line-height:1.6;">
          It only takes a minute to get set up.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Verify email &amp; select plan
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          If you didn't create a ReviewOptic account, you can safely ignore this email.
        </p>
        ${POWERED_BY_FOOTER}
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
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject: `You've been invited to join ${companyName} on ReviewOptic`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">You've been invited!</h2>
        <p style="color:#555;margin:0 0 8px;line-height:1.6;">
          ${inviterName} has invited you to join <strong>${companyName}</strong> on ReviewOptic.
        </p>
        <p style="color:#555;margin:0 0 24px;line-height:1.6;">
          Click the button below to set your password and get started.
        </p>
        <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Accept invitation
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px;line-height:1.6;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
        ${POWERED_BY_FOOTER}
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

function customerUnsubscribeFooter(customerId: string): string {
  const unsubUrl = `${APP_URL}/api/unsubscribe/customer?cid=${encodeURIComponent(customerId)}`;
  return `
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;text-align:center;">
    <span style="font-size:11px;color:#9ca3af;">
      Don't want to receive emails like this?
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
    </span>
  </div>`;
}

function platformUnsubscribeFooter(userId: string): string {
  const unsubUrl = `${APP_URL}/api/unsubscribe/platform?uid=${encodeURIComponent(userId)}`;
  return `
  <div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:12px;text-align:center;">
    <span style="font-size:11px;color:#9ca3af;">
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe from ReviewOptic emails</a>
    </span>
  </div>`;
}

export async function sendReviewEmail(
  customer: Customer,
  settings: Settings,
  template?: { subject: string; body: string } | null,
  selectedPlatforms?: { name: string; url: string }[]
): Promise<void> {
  console.log(`[sendReviewEmail] called for ${customer.email}, hasKey=${!!process.env.RESEND_API_KEY}`);
  if (!customer.email) return;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[review request] No RESEND_API_KEY. Would email ${customer.email}`);
    return;
  }

  // Only show platform buttons if explicitly provided — no fallback button
  const platforms = selectedPlatforms?.length ? selectedPlatforms : [];
  const primaryLink = platforms[0]?.url || "";

  const logoAlign = settings.logoPosition === "center" ? "center" : settings.logoPosition === "right" ? "right" : "left";
  const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
  const logoSrc = settings.logoUrl?.startsWith("http") ? settings.logoUrl : settings.logoUrl ? `${baseUrl}${settings.logoUrl}` : "";
  const logoImg = logoSrc
    ? `<img src="${logoSrc}" alt="${settings.businessName}" style="max-height:112px;max-width:300px;object-fit:contain;display:inline-block;" />`
    : "";
  const websiteHref = settings.websiteUrl
    ? (settings.websiteUrl.startsWith("http") ? settings.websiteUrl : `https://${settings.websiteUrl}`)
    : "";
  const logoContent = logoImg && websiteHref
    ? `<a href="${websiteHref}" target="_blank" style="text-decoration:none;">${logoImg}</a>`
    : logoImg;
  const logoHtml = logoContent
    ? `<div style="text-align:${logoAlign};margin-bottom:24px;">${logoContent}</div>`
    : "";

  const platformButtons = platforms.map(p =>
    `<a href="${p.url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px 4px 4px 0;">Review us on ${p.name}</a>`
  ).join("");

  let subject: string;
  let html: string;

  const defaultSubject = `How was your experience with ${settings.businessName}?`;
  if (template?.body) {
    subject = applyMergeTags(template.subject || defaultSubject, customer, settings, primaryLink);
    const bodyText = applyMergeTags(template.body, customer, settings, primaryLink);
    html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
      ${logoHtml}
      ${bodyText.replace(/\n/g, "<br>")}
      ${platforms.length ? `<br><br>${platformButtons}` : ""}
      ${POWERED_BY_FOOTER}
      ${customerUnsubscribeFooter(customer.id)}
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
      ${platformButtons}
      ${POWERED_BY_FOOTER}
      ${customerUnsubscribeFooter(customer.id)}
    </div>`;
  }

  console.log(`[sendReviewEmail] sending to=${customer.email} subject="${subject}"`);
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
  appUrl: string
): Promise<void> {
  if (!customer.email) return;
  if (!process.env.RESEND_API_KEY) {
    console.log(`[pre-screen email] No RESEND_API_KEY. Would email ${customer.email}`);
    return;
  }

  const firstName = customer.name.split(" ")[0];
  const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : appUrl);
  const logoAlign = settings.logoPosition === "center" ? "center" : settings.logoPosition === "right" ? "right" : "left";
  const logoSrc = settings.logoUrl?.startsWith("http") ? settings.logoUrl : settings.logoUrl ? `${baseUrl}${settings.logoUrl}` : "";
  const logoImg = logoSrc ? `<img src="${logoSrc}" alt="${settings.businessName}" style="max-height:112px;max-width:300px;object-fit:contain;display:inline-block;" />` : "";
  const websiteHref = settings.websiteUrl ? (settings.websiteUrl.startsWith("http") ? settings.websiteUrl : `https://${settings.websiteUrl}`) : "";
  const logoContent = logoImg && websiteHref ? `<a href="${websiteHref}" target="_blank" style="text-decoration:none;">${logoImg}</a>` : logoImg;
  const logoHtml = logoContent ? `<div style="text-align:${logoAlign};margin-bottom:24px;">${logoContent}</div>` : "";

  const stars = [1, 2, 3, 4, 5].map(n =>
    `<td style="padding:0 6px;text-align:center;">
      <a href="${baseUrl}/review-landing?rid=${requestId}&rating=${n}"
         style="display:inline-block;width:52px;height:52px;line-height:52px;text-align:center;font-size:42px;color:#f59e0b;text-decoration:none;font-family:Arial,sans-serif;">&#9733;</a>
      <div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:2px;">${n}</div>
    </td>`
  ).join("");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: customerFrom(settings),
    replyTo: settings.businessEmail || undefined,
    to: customer.email,
    subject: `How would you rate your experience with ${settings.businessName}?`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111;">
        ${logoHtml}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">Hi ${firstName},</h2>
        <p style="color:#555;margin:0 0 28px;line-height:1.6;">
          Thank you for choosing ${settings.businessName}! How would you rate your experience? Tap a star below:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 auto 24px;">
          <tr>${stars}</tr>
        </table>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0 0 32px;">Tap a star to submit your rating</p>
        ${POWERED_BY_FOOTER}
        ${customerUnsubscribeFooter(customer.id)}
        <img src="${baseUrl}/api/track/${requestId}/open" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />
      </div>
    `,
  });
  console.log(`[pre-screen email] result:`, JSON.stringify(result));
}

export async function sendPlatformReviewRequest(user: { id: string; email: string; firstName: string; companyName: string }, isFollowUp: boolean) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[platform review request] No RESEND_API_KEY. Would email ${user.email}`);
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
        ${POWERED_BY_FOOTER}
        ${platformUnsubscribeFooter(user.id)}
      </div>
    `,
  });
  console.log(`[platform review request] Sent to ${user.email} (followUp=${isFollowUp})`);
}

export async function sendCancellationEmail(to: string, firstName: string, accessEndsDate: string, reactivateUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[cancellation email] No RESEND_API_KEY. Would have sent to ${to}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: REVIEWOPTIC_FROM,
    to,
    subject: "Your ReviewOptic subscription has been cancelled",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111;">
        ${LOGO_HTML}
        <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">We're sorry to see you go${firstName ? `, ${firstName}` : ""}</h2>
        <p style="color:#555;margin:0 0 16px;line-height:1.6;">
          Your subscription has been cancelled. You'll continue to have full access to your account until <strong>${accessEndsDate}</strong> — after that, your account will be locked.
        </p>
        <p style="color:#555;margin:0 0 16px;line-height:1.6;">
          Your data is safe and will be waiting for you if you ever decide to come back. We'd love to have you.
        </p>
        <a href="${reactivateUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px;">
          Reactivate my subscription
        </a>
        <p style="color:#555;margin:0 0 8px;line-height:1.6;">
          If you have any feedback on how we could improve, or if there's anything we could have done differently, we'd genuinely love to hear it — just reply to this email.
        </p>
        <p style="color:#555;margin:0;line-height:1.6;">
          Thank you for being a ReviewOptic customer.
        </p>
        <p style="color:#999;font-size:12px;margin-top:32px;">The ReviewOptic team</p>
        ${POWERED_BY_FOOTER}
      </div>
    `,
  });
}
