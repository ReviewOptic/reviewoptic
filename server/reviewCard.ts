import sharp from "sharp";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toInitials(name: string): string {
  return escapeXml(
    name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() + ".").join(" ")
  );
}

// Wrap review text into lines for SVG (no native wrapping in SVG)
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Truncate if text was cut off
  if (lines.length === maxLines) {
    const joined = lines.join(" ");
    if (text.trim().length > joined.length + 1) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.slice(0, maxCharsPerLine - 3).trimEnd() + "...";
    }
  }
  return lines;
}

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  checkatrade: "Checkatrade",
  trustpilot: "Trustpilot",
  tripadvisor: "TripAdvisor",
  mybuilder: "MyBuilder",
  yell: "Yell",
  reviewoptic: "ReviewOptic",
};

// ── Template builders ───────────────────────────────────────────────────────

function classicTemplate(stars: number, displayName: string, biz: string, lines: string[], platformLabel: string): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const hasQuote = lines.length > 0;

  const quoteStartY = hasQuote ? 260 : 0;
  const lineSpacing = 62;
  const quoteBlockH = hasQuote ? lines.length * lineSpacing + 60 : 0;
  const starsY = hasQuote ? quoteStartY + quoteBlockH + 60 : 400;
  const nameY = starsY + 90;
  const dividerY = nameY + 38;
  const bizY = dividerY + 65;

  const quoteLines = hasQuote ? lines.map((l, i) =>
    `<text x="540" y="${quoteStartY + 40 + i * lineSpacing}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.92)" font-style="italic">${escapeXml(l)}</text>`
  ).join("\n  ") : "";

  const openQuote = hasQuote ? `<text x="130" y="${quoteStartY + 10}" font-size="120" font-family="Georgia, serif" fill="rgba(255,255,255,0.18)" text-anchor="middle">“</text>` : "";
  const closeQuote = hasQuote ? `<text x="950" y="${quoteStartY + quoteBlockH}" font-size="120" font-family="Georgia, serif" fill="rgba(255,255,255,0.18)" text-anchor="middle">”</text>` : "";

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
  <rect x="60" y="60" width="960" height="960" rx="48" fill="rgba(255,255,255,0.05)"/>
  ${openQuote}
  ${quoteLines}
  ${closeQuote}
  <text x="540" y="${starsY}" font-size="100" text-anchor="middle" font-family="sans-serif" fill="#fbbf24" letter-spacing="6">${starsStr}</text>
  <text x="540" y="${nameY}" font-size="52" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.85)">${displayName}</text>
  <rect x="440" y="${dividerY}" width="200" height="2" rx="1" fill="rgba(255,255,255,0.2)"/>
  <text x="540" y="${bizY}" font-size="38" text-anchor="middle" font-family="sans-serif" fill="#bfdbfe" font-weight="500">${biz}</text>
  <rect x="320" y="982" width="440" height="52" rx="26" fill="rgba(255,255,255,0.12)"/>
  <text x="540" y="1016" font-size="22" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.65)">${platformLabel ? `From ${escapeXml(platformLabel)} · ` : ""}Posted by ReviewOptic</text>
</svg>`;
}

function darkTemplate(stars: number, displayName: string, biz: string, lines: string[], platformLabel: string): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const hasQuote = lines.length > 0;
  const quoteStartY = hasQuote ? 260 : 0;
  const lineSpacing = 62;
  const quoteBlockH = hasQuote ? lines.length * lineSpacing + 60 : 0;
  const starsY = hasQuote ? quoteStartY + quoteBlockH + 60 : 400;
  const nameY = starsY + 90;
  const dividerY = nameY + 38;
  const bizY = dividerY + 65;

  const quoteLines = hasQuote ? lines.map((l, i) =>
    `<text x="540" y="${quoteStartY + 40 + i * lineSpacing}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.9)" font-style="italic">${escapeXml(l)}</text>`
  ).join("\n  ") : "";

  const openQuote = hasQuote ? `<text x="130" y="${quoteStartY + 10}" font-size="120" font-family="Georgia, serif" fill="rgba(245,158,11,0.25)" text-anchor="middle">“</text>` : "";
  const closeQuote = hasQuote ? `<text x="950" y="${quoteStartY + quoteBlockH}" font-size="120" font-family="Georgia, serif" fill="rgba(245,158,11,0.25)" text-anchor="middle">”</text>` : "";

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect x="0" y="0" width="1080" height="6" fill="#f59e0b"/>
  <rect x="0" y="1074" width="1080" height="6" fill="#f59e0b"/>
  <rect x="60" y="60" width="960" height="960" rx="48" fill="rgba(255,255,255,0.02)" stroke="rgba(245,158,11,0.2)" stroke-width="1"/>
  ${openQuote}
  ${quoteLines}
  ${closeQuote}
  <text x="540" y="${starsY}" font-size="100" text-anchor="middle" font-family="sans-serif" fill="#f59e0b" letter-spacing="6">${starsStr}</text>
  <text x="540" y="${nameY}" font-size="52" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.8)">${displayName}</text>
  <rect x="440" y="${dividerY}" width="200" height="2" rx="1" fill="rgba(245,158,11,0.3)"/>
  <text x="540" y="${bizY}" font-size="38" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.5)">${biz}</text>
  <rect x="320" y="982" width="440" height="52" rx="26" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>
  <text x="540" y="1016" font-size="22" text-anchor="middle" font-family="sans-serif" fill="rgba(245,158,11,0.75)">${platformLabel ? `From ${escapeXml(platformLabel)} · ` : ""}Posted by ReviewOptic</text>
</svg>`;
}

function warmTemplate(stars: number, displayName: string, biz: string, lines: string[], platformLabel: string): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const hasQuote = lines.length > 0;
  const quoteStartY = hasQuote ? 260 : 0;
  const lineSpacing = 62;
  const quoteBlockH = hasQuote ? lines.length * lineSpacing + 60 : 0;
  const starsY = hasQuote ? quoteStartY + quoteBlockH + 60 : 400;
  const nameY = starsY + 90;
  const dividerY = nameY + 38;
  const bizY = dividerY + 65;

  const quoteLines = hasQuote ? lines.map((l, i) =>
    `<text x="540" y="${quoteStartY + 40 + i * lineSpacing}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.95)" font-style="italic">${escapeXml(l)}</text>`
  ).join("\n  ") : "";

  const openQuote = hasQuote ? `<text x="130" y="${quoteStartY + 10}" font-size="120" font-family="Georgia, serif" fill="rgba(255,255,255,0.2)" text-anchor="middle">“</text>` : "";
  const closeQuote = hasQuote ? `<text x="950" y="${quoteStartY + quoteBlockH}" font-size="120" font-family="Georgia, serif" fill="rgba(255,255,255,0.2)" text-anchor="middle">”</text>` : "";

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
  <rect x="60" y="60" width="960" height="960" rx="48" fill="rgba(255,255,255,0.07)"/>
  ${openQuote}
  ${quoteLines}
  ${closeQuote}
  <text x="540" y="${starsY}" font-size="100" text-anchor="middle" font-family="sans-serif" fill="#fef3c7" letter-spacing="6">${starsStr}</text>
  <text x="540" y="${nameY}" font-size="52" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.9)">${displayName}</text>
  <rect x="440" y="${dividerY}" width="200" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
  <text x="540" y="${bizY}" font-size="38" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.8)">${biz}</text>
  <rect x="320" y="982" width="440" height="52" rx="26" fill="rgba(0,0,0,0.2)"/>
  <text x="540" y="1016" font-size="22" text-anchor="middle" font-family="sans-serif" fill="rgba(255,255,255,0.75)">${platformLabel ? `From ${escapeXml(platformLabel)} · ` : ""}Posted by ReviewOptic</text>
</svg>`;
}

function cleanTemplate(stars: number, displayName: string, biz: string, lines: string[], platformLabel: string): string {
  const starsStr = "★".repeat(stars) + "☆".repeat(5 - stars);
  const hasQuote = lines.length > 0;
  const quoteStartY = hasQuote ? 260 : 0;
  const lineSpacing = 62;
  const quoteBlockH = hasQuote ? lines.length * lineSpacing + 60 : 0;
  const starsY = hasQuote ? quoteStartY + quoteBlockH + 60 : 400;
  const nameY = starsY + 90;
  const dividerY = nameY + 38;
  const bizY = dividerY + 65;

  const quoteLines = hasQuote ? lines.map((l, i) =>
    `<text x="540" y="${quoteStartY + 40 + i * lineSpacing}" font-size="42" text-anchor="middle" font-family="sans-serif" fill="#1e293b" font-style="italic">${escapeXml(l)}</text>`
  ).join("\n  ") : "";

  const openQuote = hasQuote ? `<text x="130" y="${quoteStartY + 10}" font-size="120" font-family="Georgia, serif" fill="rgba(59,130,246,0.15)" text-anchor="middle">“</text>` : "";
  const closeQuote = hasQuote ? `<text x="950" y="${quoteStartY + quoteBlockH}" font-size="120" font-family="Georgia, serif" fill="rgba(59,130,246,0.15)" text-anchor="middle">”</text>` : "";

  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="#f8fafc"/>
  <rect x="0" y="0" width="1080" height="8" fill="#3b82f6"/>
  <rect x="80" y="84" width="920" height="920" rx="44" fill="rgba(0,0,0,0.03)"/>
  <rect x="70" y="70" width="940" height="940" rx="44" fill="#ffffff"/>
  ${openQuote}
  ${quoteLines}
  ${closeQuote}
  <text x="540" y="${starsY}" font-size="100" text-anchor="middle" font-family="sans-serif" fill="#f59e0b" letter-spacing="6">${starsStr}</text>
  <text x="540" y="${nameY}" font-size="52" text-anchor="middle" font-family="sans-serif" fill="#334155">${displayName}</text>
  <rect x="440" y="${dividerY}" width="200" height="2" rx="1" fill="#e2e8f0"/>
  <text x="540" y="${bizY}" font-size="38" text-anchor="middle" font-family="sans-serif" fill="#64748b">${biz}</text>
  <rect x="320" y="982" width="440" height="52" rx="26" fill="#f1f5f9"/>
  <text x="540" y="1016" font-size="22" text-anchor="middle" font-family="sans-serif" fill="#94a3b8">${platformLabel ? `From ${escapeXml(platformLabel)} · ` : ""}Posted by ReviewOptic</text>
</svg>`;
}

export async function generateReviewCard(
  stars: number,
  customerName: string,
  businessName: string,
  template: string = "classic",
  reviewText: string = "",
  platform: string = ""
): Promise<Buffer> {
  const starsFilled = Math.min(5, Math.max(1, Math.round(stars)));
  const displayName = toInitials(customerName);
  const biz = escapeXml(businessName);
  const platformLabel = PLATFORM_LABELS[platform.toLowerCase()] || platform;

  // Wrap review text into max 3 lines of ~36 chars each
  const lines = reviewText.trim() ? wrapText(reviewText.trim(), 36, 3) : [];

  let svg: string;
  switch (template) {
    case "dark":  svg = darkTemplate(starsFilled, displayName, biz, lines, platformLabel); break;
    case "warm":  svg = warmTemplate(starsFilled, displayName, biz, lines, platformLabel); break;
    case "clean": svg = cleanTemplate(starsFilled, displayName, biz, lines, platformLabel); break;
    default:      svg = classicTemplate(starsFilled, displayName, biz, lines, platformLabel);
  }

  return sharp(Buffer.from(svg)).png().toBuffer();
}
