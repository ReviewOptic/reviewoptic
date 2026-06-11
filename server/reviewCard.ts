import sharp from "sharp";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function firstNameLastInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return escapeXml(parts[0]);
  return escapeXml(`${parts[0]} ${parts[parts.length - 1][0]}.`);
}

async function fetchLogoBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildLogoSvg(logoDataUri: string | null, showLogo: boolean, yOffset: number): string {
  if (!showLogo || !logoDataUri) return "";
  return `
  <!-- Logo container -->
  <rect x="465" y="${yOffset}" width="150" height="150" rx="20" fill="rgba(255,255,255,0.15)"/>
  <image href="${logoDataUri}" x="475" y="${yOffset + 10}" width="130" height="130" preserveAspectRatio="xMidYMid meet" clip-path="inset(0 round 14px)"/>`;
}

function buildLogoSvgDark(logoDataUri: string | null, showLogo: boolean, yOffset: number): string {
  if (!showLogo || !logoDataUri) return "";
  return `
  <rect x="465" y="${yOffset}" width="150" height="150" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <image href="${logoDataUri}" x="475" y="${yOffset + 10}" width="130" height="130" preserveAspectRatio="xMidYMid meet"/>`;
}

function buildLogoSvgClean(logoDataUri: string | null, showLogo: boolean, yOffset: number): string {
  if (!showLogo || !logoDataUri) return "";
  return `
  <rect x="465" y="${yOffset}" width="150" height="150" rx="20" fill="#f1f5f9"/>
  <image href="${logoDataUri}" x="475" y="${yOffset + 10}" width="130" height="130" preserveAspectRatio="xMidYMid meet"/>`;
}

function classicTemplate(stars: number, displayName: string, biz: string, logoSvg: string, hasLogo: boolean): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const starsY = hasLogo ? 480 : 380;
  const ratingY = starsY + 90;
  const nameY = ratingY + 120;
  const dividerY = nameY + 38;
  const bizY = dividerY + 70;
  const badgeY = bizY + 100;

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <circle cx="1020" cy="60" r="320" fill="rgba(255,255,255,0.04)"/>
  <circle cx="60" cy="1020" r="240" fill="rgba(255,255,255,0.04)"/>
  <rect x="80" y="80" width="920" height="920" rx="48" fill="rgba(255,255,255,0.06)"/>
  ${hasLogo ? buildLogoSvg(logoSvg, true, 200) : ""}
  <text x="540" y="${starsY}" font-size="110" text-anchor="middle" font-family="sans-serif" fill="#fbbf24" letter-spacing="8">${starsStr}</text>
  <text x="540" y="${ratingY}" font-size="36" text-anchor="middle" font-family="sans-serif" fill="#93c5fd">${stars}-star rating</text>
  <text x="540" y="${nameY}" font-size="66" text-anchor="middle" font-family="sans-serif" fill="#ffffff" font-weight="700">${displayName}</text>
  <rect x="420" y="${dividerY}" width="240" height="3" rx="2" fill="rgba(255,255,255,0.2)"/>
  <text x="540" y="${bizY}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="#bfdbfe" font-weight="500">${biz}</text>
  <rect x="350" y="${badgeY}" width="380" height="52" rx="26" fill="rgba(255,255,255,0.12)"/>
  <text x="540" y="${badgeY + 34}" font-size="24" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.7)">Posted by ReviewOptic</text>
</svg>`;
}

function darkTemplate(stars: number, displayName: string, biz: string, logoSvg: string, hasLogo: boolean): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const starsY = hasLogo ? 480 : 380;
  const ratingY = starsY + 90;
  const nameY = ratingY + 120;
  const dividerY = nameY + 38;
  const bizY = dividerY + 70;
  const badgeY = bizY + 100;

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <!-- Gold accent lines -->
  <rect x="0" y="0" width="1080" height="6" fill="#f59e0b"/>
  <rect x="0" y="1074" width="1080" height="6" fill="#f59e0b"/>
  <rect x="80" y="80" width="920" height="920" rx="48" fill="rgba(255,255,255,0.03)" stroke="rgba(245,158,11,0.25)" stroke-width="1"/>
  ${hasLogo ? buildLogoSvgDark(logoSvg, true, 200) : ""}
  <text x="540" y="${starsY}" font-size="110" text-anchor="middle" font-family="sans-serif" fill="#f59e0b" letter-spacing="8">${starsStr}</text>
  <text x="540" y="${ratingY}" font-size="36" text-anchor="middle" font-family="sans-serif" fill="rgba(245,158,11,0.7)">${stars}-star rating</text>
  <text x="540" y="${nameY}" font-size="66" text-anchor="middle" font-family="sans-serif" fill="#ffffff" font-weight="700">${displayName}</text>
  <rect x="420" y="${dividerY}" width="240" height="2" rx="1" fill="rgba(245,158,11,0.3)"/>
  <text x="540" y="${bizY}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.6)" font-weight="400">${biz}</text>
  <rect x="350" y="${badgeY}" width="380" height="52" rx="26" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>
  <text x="540" y="${badgeY + 34}" font-size="24" text-anchor="middle" font-family="sans-serif" fill="rgba(245,158,11,0.8)">Posted by ReviewOptic</text>
</svg>`;
}

function warmTemplate(stars: number, displayName: string, biz: string, logoSvg: string, hasLogo: boolean): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const starsY = hasLogo ? 480 : 380;
  const ratingY = starsY + 90;
  const nameY = ratingY + 120;
  const dividerY = nameY + 38;
  const bizY = dividerY + 70;
  const badgeY = bizY + 100;

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c2410c"/>
      <stop offset="50%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <circle cx="1060" cy="100" r="300" fill="rgba(255,255,255,0.06)"/>
  <circle cx="20" cy="980" r="280" fill="rgba(0,0,0,0.08)"/>
  <rect x="80" y="80" width="920" height="920" rx="48" fill="rgba(255,255,255,0.08)"/>
  ${hasLogo ? buildLogoSvg(logoSvg, true, 200) : ""}
  <text x="540" y="${starsY}" font-size="110" text-anchor="middle" font-family="sans-serif" fill="#fef3c7" letter-spacing="8">${starsStr}</text>
  <text x="540" y="${ratingY}" font-size="36" text-anchor="middle" font-family="sans-serif" fill="rgba(254,243,199,0.8)">${stars}-star rating</text>
  <text x="540" y="${nameY}" font-size="66" text-anchor="middle" font-family="sans-serif" fill="#ffffff" font-weight="700">${displayName}</text>
  <rect x="420" y="${dividerY}" width="240" height="3" rx="2" fill="rgba(255,255,255,0.3)"/>
  <text x="540" y="${bizY}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.85)" font-weight="500">${biz}</text>
  <rect x="350" y="${badgeY}" width="380" height="52" rx="26" fill="rgba(0,0,0,0.2)"/>
  <text x="540" y="${badgeY + 34}" font-size="24" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.8)">Posted by ReviewOptic</text>
</svg>`;
}

function cleanTemplate(stars: number, displayName: string, biz: string, logoSvg: string, hasLogo: boolean): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const starsY = hasLogo ? 480 : 380;
  const ratingY = starsY + 90;
  const nameY = ratingY + 120;
  const dividerY = nameY + 38;
  const bizY = dividerY + 70;
  const badgeY = bizY + 100;

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="#f8fafc"/>
  <!-- Subtle top bar -->
  <rect x="0" y="0" width="1080" height="8" fill="#3b82f6"/>
  <!-- Card shadow illusion -->
  <rect x="100" y="104" width="880" height="880" rx="44" fill="rgba(0,0,0,0.04)"/>
  <rect x="90" y="90" width="900" height="900" rx="44" fill="#ffffff"/>
  ${hasLogo ? buildLogoSvgClean(logoSvg, true, 200) : ""}
  <text x="540" y="${starsY}" font-size="110" text-anchor="middle" font-family="sans-serif" fill="#f59e0b" letter-spacing="8">${starsStr}</text>
  <text x="540" y="${ratingY}" font-size="36" text-anchor="middle" font-family="sans-serif" fill="#64748b">${stars}-star rating</text>
  <text x="540" y="${nameY}" font-size="66" text-anchor="middle" font-family="sans-serif" fill="#0f172a" font-weight="700">${displayName}</text>
  <rect x="420" y="${dividerY}" width="240" height="2" rx="1" fill="#e2e8f0"/>
  <text x="540" y="${bizY}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="#475569" font-weight="500">${biz}</text>
  <rect x="350" y="${badgeY}" width="380" height="52" rx="26" fill="#f1f5f9"/>
  <text x="540" y="${badgeY + 34}" font-size="24" text-anchor="middle" font-family="sans-serif" fill="#94a3b8">Posted by ReviewOptic</text>
</svg>`;
}

export async function generateReviewCard(
  stars: number,
  customerName: string,
  businessName: string,
  template: string = "classic",
  logoUrl: string = "",
  showLogo: boolean = false
): Promise<Buffer> {
  const starsFilled = Math.min(5, Math.max(1, Math.round(stars)));
  const displayName = firstNameLastInitial(customerName);
  const biz = escapeXml(businessName);

  let logoDataUri: string | null = null;
  if (showLogo && logoUrl) {
    logoDataUri = await fetchLogoBase64(logoUrl);
  }
  const hasLogo = !!(showLogo && logoDataUri);

  let svg: string;
  switch (template) {
    case "dark":
      svg = darkTemplate(starsFilled, displayName, biz, logoDataUri ?? "", hasLogo);
      break;
    case "warm":
      svg = warmTemplate(starsFilled, displayName, biz, logoDataUri ?? "", hasLogo);
      break;
    case "clean":
      svg = cleanTemplate(starsFilled, displayName, biz, logoDataUri ?? "", hasLogo);
      break;
    default:
      svg = classicTemplate(starsFilled, displayName, biz, logoDataUri ?? "", hasLogo);
  }

  return sharp(Buffer.from(svg)).png().toBuffer();
}
