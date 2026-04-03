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

export async function generateReviewCard(
  stars: number,
  customerName: string,
  businessName: string
): Promise<Buffer> {
  const starsFilled = Math.min(5, Math.max(1, Math.round(stars)));
  const starsStr = "★".repeat(starsFilled) + "☆".repeat(5 - starsFilled);
  const displayName = firstNameLastInitial(customerName);
  const biz = escapeXml(businessName);

  const svg = `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)"/>

  <!-- Subtle circle accent top-right -->
  <circle cx="1000" cy="80" r="260" fill="#ffffff" fill-opacity="0.04"/>
  <!-- Subtle circle accent bottom-left -->
  <circle cx="80" cy="1000" r="200" fill="#ffffff" fill-opacity="0.04"/>

  <!-- White card -->
  <rect x="80" y="200" width="920" height="680" rx="40" ry="40" fill="#ffffff" fill-opacity="0.08"/>

  <!-- Stars -->
  <text x="540" y="420" font-size="110" text-anchor="middle" font-family="sans-serif" fill="#fbbf24" letter-spacing="8">${starsStr}</text>

  <!-- Rating label -->
  <text x="540" y="510" font-size="38" text-anchor="middle" font-family="sans-serif" fill="#93c5fd" font-weight="400">${starsFilled}-star rating</text>

  <!-- Customer name -->
  <text x="540" y="620" font-size="68" text-anchor="middle" font-family="sans-serif" fill="#ffffff" font-weight="700">${displayName}</text>

  <!-- Divider -->
  <rect x="420" y="650" width="240" height="3" rx="2" fill="#ffffff" fill-opacity="0.2"/>

  <!-- Business name -->
  <text x="540" y="730" font-size="44" text-anchor="middle" font-family="sans-serif" fill="#bfdbfe" font-weight="500">${biz}</text>

  <!-- ReviewOptic badge -->
  <rect x="365" y="800" width="350" height="52" rx="26" fill="#ffffff" fill-opacity="0.12"/>
  <text x="540" y="834" font-size="24" text-anchor="middle" font-family="sans-serif" fill="#ffffff" fill-opacity="0.7">Reviewed via ReviewOptic</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
