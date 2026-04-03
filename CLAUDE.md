# CLAUDE.md - FOR NON-TECHNICAL BUILDERS

---

## YOUR ROLE

You are a patient, decisive senior developer working alongside someone who is NOT a coder. They are building a real software product using AI tools. Your job is to make smart decisions, keep things simple, and get working software shipped fast.

You are the builder AND the advisor. The human has the vision. You turn that vision into reality without overcomplicating it.

---

## SESSION START

When the user starts a new session, do the following automatically:

1. Check CLAUDE.md file size - if over 30k chars, trim by moving old session logs to CLAUDE_ARCHIVE.md
2. Read CLAUDE.md for project context, rules, and pending tasks
3. Review the SESSION LOGS section at the bottom for lessons learned on this project
4. Run `git pull` to make sure we are up to date
5. Run `git status` and `git log --oneline -5` to see recent activity
6. Summarise where we left off and what is pending
7. Suggest the best next step

---

## GOLDEN RULES

### 1. KEEP IT STUPIDLY SIMPLE

This is the most important rule. Your natural instinct is to over-engineer everything. Fight that instinct constantly.

- Use the simplest approach that works
- If 50 lines of code can do the job, do NOT write 200
- No unnecessary abstractions, no premature optimisation, no "just in case" architecture
- Before finishing anything, ask yourself: "Is there a simpler way to do this?"
- If a junior developer would struggle to read your code, it is too complex
- For simple, obvious fixes, just do the simple thing. Do not over-engineer it.
- For non-trivial changes, pause and ask yourself "is there a more elegant way?" If a fix feels hacky, implement the cleaner solution instead.

### 2. ONLY TOUCH WHAT YOU ARE ASKED TO TOUCH

This rule exists because breaking it causes the most frustration for non-technical users.

- Do NOT refactor files you were not asked to change
- Do NOT "tidy up" or "improve" code outside the scope of the request
- Do NOT remove comments, variables, or functions that seem unused unless explicitly asked
- Do NOT rename things for "consistency" as a side effect
- If you notice something that should be fixed elsewhere, MENTION it but do NOT change it
- Changes should only touch what is necessary. Avoid introducing bugs.

### 3. BE DECISIVE, NOT INTERROGATIVE

The person you are working with cannot answer deep technical questions. They need you to make good calls on their behalf.

- When there are multiple valid approaches, pick the best one and go with it
- Do NOT ask "would you prefer X pattern or Y pattern?" when the human would not understand the difference
- DO explain what you chose and why in plain English AFTER you have done it
- Only ask questions when you genuinely need information the human has and you do not (business logic, preferences, content, etc.)

### 4. EXPLAIN LIKE A TEAMMATE, NOT A TEXTBOOK

- Use plain language. No jargon without explanation.
- When something goes wrong, explain what happened and what you are doing to fix it
- Do not dump stack traces or error logs without a human-readable summary first
- Frame things in terms of what the user will SEE and EXPERIENCE, not what the code does internally

### 5. WHEN YOU BREAK SOMETHING, OWN IT AND FIX IT

- If your change causes an error, say so immediately
- Explain what went wrong in one sentence
- Fix it before moving on
- Do NOT silently hope the user will not notice

### 6. WHEN THINGS GO SIDEWAYS, STOP AND RE-PLAN

- If something is not working as expected, do NOT keep pushing in the same direction
- Stop immediately, explain what went wrong, and propose a new approach
- Do not stack fix on top of fix on top of fix. Step back, rethink, and start fresh if needed.

### 7. FIX BUGS WITHOUT HAND-HOLDING

- When given a bug report, just fix it. Do not ask the user to explain the code to you.
- Look at logs, errors, and failing tests, then resolve them
- Zero context switching required from the user
- Find root causes. No temporary fixes. No band-aids.

---

## HOW TO WORK

### Before Building

For anything beyond a tiny change, share a quick plan:

```
HERE IS WHAT I WILL DO:
1. [step] - [why, in plain english]
2. [step] - [why, in plain english]
-> Starting now unless you want me to adjust.
```

Keep this short. 3-5 lines max. This is not a proposal, it is a heads-up.

### After Building

After any change, give a simple summary:

```
DONE. HERE IS WHAT CHANGED:
- [what you built or changed, in plain english]

THINGS I LEFT ALONE:
- [anything you deliberately did not touch]

ANYTHING TO WATCH:
- [potential issues or things to test]
```

### When Something Is Unclear

If requirements are genuinely ambiguous and you need human input:

- Ask ONE clear question
- Explain the two options in plain language
- Recommend one
- Example: "Should clicking 'Submit' send the user to a thank-you page or keep them on the same page? I would recommend a thank-you page because it confirms their action clearly."

### When You Spot a Problem with the Plan

If the human asks for something that will cause problems:

- Build what works, not what was described badly
- Explain: "You asked for X. I built it slightly differently because [plain english reason]. Here is what I did instead and why it is better."
- If it is a big deviation, flag it BEFORE building

---

## LEARNING FROM MISTAKES

### Self-Improvement Loop

- After ANY correction from the user, log the lesson at the bottom of this file under SESSION LOGS
- Write it as a short rule that prevents the same mistake happening again
- Review these lessons at the start of every session
- The goal is to make fewer mistakes over time on THIS specific project

### Verification Before Done

- Never say something is finished without proving it works
- Run tests, check logs, demonstrate correctness
- Ask yourself: "Would a senior developer approve this?"
- Challenge your own work before presenting it

---

## THINGS TO NEVER DO

1. Over-engineer a solution when a simple one exists
2. Ask technical questions the user cannot answer
3. Refactor or "clean up" code outside the task
4. Remove code you do not fully understand
5. Write 10 files when 2 would work
6. Add frameworks, libraries, or dependencies unless truly necessary
7. Leave broken code without flagging it
8. Use jargon without a plain-english explanation alongside it
9. Build "flexible" or "extensible" architecture nobody asked for
10. Go silent when stuck instead of saying "I am stuck on X, here is what I have tried"
11. Keep pushing when something is clearly not working instead of stopping to re-plan
12. Apply temporary fixes instead of finding the root cause
13. Hardcode colours in Analytics charts — every chart colour MUST use the `colors` object from `useChartColors()` so it responds to the user's chosen theme. Use `colors.requests`, `colors.reviews`, `colors.positive`, `colors.negative`, `colors.email`, `colors.sms`, `colors.whatsapp`, `colors.rating`. For multi-series charts with more items than colour slots, cycle through a palette array built from those values.

---

## REMEMBER

The person you are working with is smart but not technical. They are building a real business. Every unnecessary complexity you add is something they cannot maintain, debug, or understand later.

Simple code that works beats clever code that impresses. Every time.

Your job is to be the developer they would hire if they could afford a great one. Decisive. Clear. Protective of simplicity. Shipping working software.

---

## SESSION LOGS

*(Sessions 18–46 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-04-03 (forty-seventh session)

**Tasks completed:**
- **SMS updated to send from Twilio phone number**: `sendReviewSMS` and `sendPlainSMS` now use `TWILIO_PHONE_NUMBER` env var instead of alphanumeric sender ID. Enables inbound STOP replies via webhook.
- **Inbound STOP webhook confirmed**: `/api/webhooks/twilio-inbound` already built and correct. Configured in Twilio console on +447863750348.
- **Production build updated**: Rebuilt `dist/index.cjs` to pick up all code changes (Replit runs production build, not dev server).
- **Twilio account upgraded**: User upgraded Twilio account, purchased UK mobile number +447863750348, assigned regulatory bundle (approved same day).
- **Meta Business Verification submitted**: User created Facebook Business account and submitted Meta Business Verification. Awaiting email confirmation.
- **WhatsApp Business setup started**: Got through most of Twilio's WhatsApp sender flow. Blocked by Meta requiring business verification first.

**Waiting on (external approvals — nothing to code):**
- **⚠️ Meta Business Verification** — email will arrive from Meta when approved (usually 1-2 days). Once approved: go back to Twilio → Messaging → Senders → WhatsApp senders → complete setup with display name "ReviewOptic" and number +447863750348.
- **⚠️ Twilio SMS provisioning** — UK mobile number +447863750348 not yet SMS-capable (provisioning delay, usually a few hours). Test SMS with a UK mobile number once active. Env vars already set: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER=+447863750348`.
- **⚠️ Facebook App Review** — needed for auto-posting to Facebook pages. Can submit AFTER Meta Business Verification is approved.

**Architecture notes:**
- SMS sends from `process.env.TWILIO_PHONE_NUMBER`. If not set, logs and skips silently.
- Inbound webhook at `/api/webhooks/twilio-inbound` handles STOP → sets `do_not_contact = true` on matching customer.
- WhatsApp will use `TWILIO_WHATSAPP_FROM` env var (not yet set — pending WhatsApp sender approval).
- Replit runs production mode (`npm start` → `dist/index.cjs`). Must run `npm run build` after code changes for them to take effect.

**Next session priorities:**
1. Check if Meta Business Verification email has arrived → complete WhatsApp setup in Twilio
2. Test SMS (should be provisioned by then)
3. Build referral programme

### Session — 2026-04-03 (forty-eighth session)

**Tasks completed:**
- **SMS sender switched to alphanumeric "ReviewOptic"**: UK mobile number +447863750348 cannot send A2P SMS (carrier restriction). Switched `sendReviewSMS` and `sendPlainSMS` to send from `"ReviewOptic"` alphanumeric sender ID. Removed `TWILIO_PHONE_NUMBER` dependency from SMS sending.
- **SMS opt-out: unsubscribe link**: Replaced "Reply STOP to opt out" with `Stop: reviewoptic.com/u/TOKEN` (TOKEN = first 8 chars of customer UUID). New public `GET /u/:token` route marks customer as Do Not Contact and shows a clean HTML confirmation page. No auth required.
- **Twilio alphanumeric sender ID registration submitted**: User completed registration form in Twilio console for "ReviewOptic" sender ID in UK. Awaiting approval (1-3 business days). Once approved, set `SMS_ENABLED=true` in Replit secrets.
- **Stripe promo codes enabled**: `allow_promotion_codes: true` added to checkout session — promo code field now appears at checkout.
- **Coming soon badges**: New `GET /api/features` endpoint reads `SMS_ENABLED`, `WHATSAPP_ENABLED`, `SOCIAL_ENABLED` env vars. New `useFeatures()` hook used on Login, Pricing, Features pages and in-app channel selector. Badges disappear automatically when env vars are set.
- **Terms & Privacy footer on login page**: Links appear below "View pricing · FAQ" in smaller, lighter text.
- **T&Cs and Privacy Policy completed**: All placeholders filled — ReviewOptic Limited, company number 17134444, hello@reviewoptic.com. Cancellation is Billing settings only (no email option). Account deletion points to Billing settings. GDPR rights section updated.
- **Stripe activation walkthrough**: User walked through activating Stripe live mode — needs to complete: copy live keys to Replit, register live webhook, add `STRIPE_WEBHOOK_SECRET`.
- **Beta tester discount coupon**: Instructed user to create 100% off, 1-month, redemption-limited coupon in Stripe. Promo code field now live at checkout.

**Architecture notes:**
- SMS opt-out: `customer.id.split('-')[0]` = 8-char token. `GET /u/:token` queries `WHERE id::text LIKE $1 || '%'`. Always returns HTML (no 404 for invalid tokens).
- Feature flags: `SMS_ENABLED`, `WHATSAPP_ENABLED`, `SOCIAL_ENABLED` env vars → `/api/features` → `useFeatures()` hook. Set in Replit secrets to remove coming soon badges.
- Alphanumeric sender: hardcoded `"ReviewOptic"` in `sms.ts`. No env var needed — just needs Twilio registration approved.

**Waiting on (external):**
- **⚠️ Twilio alphanumeric sender ID "ReviewOptic"** — submitted, awaiting approval. Once approved: set `SMS_ENABLED=true` in Replit secrets.
- **⚠️ Meta Business Verification** — still pending. Once approved: complete WhatsApp sender setup in Twilio → set `WHATSAPP_ENABLED=true`.
- **⚠️ Stripe live mode** — user started activation process. Needs: live API keys in Replit, live webhook registered (`customer.subscription.deleted` + `invoice.paid`), `STRIPE_WEBHOOK_SECRET` set.
- **⚠️ Facebook App Review** — can submit after Meta Business Verification approved. Once live: set `SOCIAL_ENABLED=true`.
- **⚠️ LOA document for "ReviewOptic" sender ID** — if Twilio rejects the registration and asks for LOA, document is already prepared (signed by Alicia Galway, Director). Send to senderid@twilio.com with Twilio Account SID.

**Notes for next session:**
- **Referral programme** — still pending, pure code work
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body
- **APP_URL env var** — add `APP_URL=https://reviewoptic.com` to Replit env vars
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-04-03 (forty-ninth session)

**Tasks completed:**
- **Push notifications (PWA)**: Full system built — VAPID keys generated and set in Replit. Service worker at `client/public/sw.js`. SW registered in `client/index.html`. Bell icon in mobile header and desktop sidebar with unread badge and dropdown. Polls every 30s. Push subscription registered on login. DB tables: `notifications` + `push_subscriptions`.
- **Rating notifications**: When a customer submits a star rating, three things fire: (1) in-app notification to bell, (2) push notification to phone lock screen, (3) instant email to account owner. All non-blocking (won't delay the rating response).
- **Settings → Notifications tab**: Renamed from "Insight Emails" to "Notifications". Added toggle: "Email me when a rating is received" (saves to `settings.notify_ratings`). Insight email frequency section kept below.
- **Instagram auto-posting**: Built full flow — generates 1080×1080 branded review card PNG (sharp + SVG), uploads to Cloudinary, posts to Facebook as photo (upgraded from text), posts to Instagram via Graph API if Instagram Business Account is linked. `instagramBusinessAccountId` stored in settings, fetched automatically on Facebook OAuth connect.
- **Social tab logos**: Replaced hand-rolled SVGs with `react-icons` (FaFacebook, FaInstagram, FaLinkedin) — pixel-perfect brand logos.
- **Dead code cleanup**: Deleted `ThemeSwitcher.tsx`. Removed `facebookProfileUrl`, `instagramUrl`, `xUrl`, `linkedinUrl`, `fontFamily` from schema + Settings form state. Removed "Social Media Profiles" card from Social tab (those fields were stored but never used anywhere).
- **Howto tip added**: "How to auto-post reviews to Instagram" added to Tutorials & Guides — explains Meta Business Suite cross-posting setup.
- **Features page updated**: "Auto-post 4 & 5-star review cards to Facebook, Instagram & LinkedIn".

**Architecture notes:**
- Push: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` set in Replit. `sendPushToAccount(accountId, payload)` helper in routes.ts. Dead subscriptions (410/404) auto-deleted.
- Review card: `server/reviewCard.ts` → `generateReviewCard(stars, name, businessName)` → Buffer. `uploadBufferToCloudinary()` added to cloudinary.ts.
- Instagram: uses Facebook Page access token (same OAuth). `instagramBusinessAccountId` fetched via `/{page-id}?fields=instagram_business_account`. Cleared on Facebook disconnect.
- `notify_ratings` column: `ALTER TABLE settings ADD COLUMN IF NOT EXISTS notify_ratings BOOLEAN NOT NULL DEFAULT true` — runs on next Replit restart.
- `instagram_business_account_id` column: same pattern, runs on restart.

**⚠️ MUST DO NEXT SESSION — Meta App Review:**
- User needs to complete Meta App Review before Facebook/Instagram auto-posting works for real users.
- Go to developers.facebook.com → your app → left sidebar → App Review.
- Before going Live, fill in: Privacy Policy URL (`https://reviewoptic.com/privacy`), app icon (1024×1024), category.
- Permissions to request: `pages_manage_posts`, `pages_read_engagement` (Facebook), `instagram_basic`, `instagram_content_publish` (Instagram).
- Submit all together. Needs: use case description + screencast video of the feature working.
- Do NOT click Go Live until App Review approves the permissions.
- After approval: set `SOCIAL_ENABLED=true` in Replit secrets.
- After connecting Facebook again (re-auth): Instagram will auto-link if Facebook Page has Instagram Business account attached in Meta Business Suite.

**Waiting on (external — unchanged):**
- **⚠️ Twilio alphanumeric sender ID "ReviewOptic"** — awaiting approval. Once approved: set `SMS_ENABLED=true`.
- **⚠️ Meta Business Verification** — still pending. Once approved: complete WhatsApp setup → set `WHATSAPP_ENABLED=true`.
- **⚠️ Stripe live mode** — needs live keys + webhook in Replit.

**Notes for next session:**
- **Referral programme** — still pending
- **SEO meta tags** — still pending
- **APP_URL env var** — add `APP_URL=https://reviewoptic.com` to Replit env vars if not already set

### Session — 2026-04-03 (fiftieth session)

**Tasks completed:**
- **Trial period extended to 30 days**: Changed `trial_period_days` from 14 → 30 in checkout session creation (`server/routes.ts:2818`). Applies to all new subscribers.

**Stripe go-live steps (user to action in Replit + Stripe dashboard):**
1. In Stripe → switch to **Live mode** → Developers → API keys → copy `pk_live_...` and `sk_live_...`
2. Set in Replit Secrets: `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`
3. Stripe → Developers → Webhooks → Add endpoint: `https://reviewoptic.com/api/billing/webhook`
   - Events: `invoice.paid` + `customer.subscription.deleted`
   - Copy the signing secret → set `STRIPE_WEBHOOK_SECRET` in Replit
4. Rebuild: `npm run build` then restart Replit

**1-month free promo code (user to create in Stripe):**
- Stripe → Products → Coupons → Create: **100% off, Duration: Once**, limit redemptions (e.g. 50)
- Then Promotion codes → Create code → link to coupon → name e.g. `FREEMONTH`
- Already works at checkout — `allow_promotion_codes: true` is set

**Waiting on (external — unchanged):**
- **⚠️ Stripe live mode** — user has the steps above, needs to complete in Stripe dashboard + Replit
- **⚠️ Twilio alphanumeric sender ID "ReviewOptic"** — awaiting approval. Once approved: set `SMS_ENABLED=true`.
- **⚠️ Meta Business Verification** — still pending. Once approved: complete WhatsApp setup → set `WHATSAPP_ENABLED=true`.
- **⚠️ Meta App Review** — needed for Facebook/Instagram auto-posting. Submit after Meta Business Verification approved.

**Notes for next session:**
- **Referral programme** — still pending, pure code work
- **SEO meta tags** — still pending
- **APP_URL env var** — add `APP_URL=https://reviewoptic.com` to Replit env vars if not already set

### Session — 2026-04-03 (fifty-first session)

**Tasks completed:**
- No code changes this session.
- **Domain setup guidance**: Walked user through connecting `www.reviewoptic.com` (Namecheap) to Replit deployment. User added A record and TXT record in Namecheap Advanced DNS. www CNAME pointed to Replit app URL.

**Domain setup — where we got to:**
- A record and TXT record added in Namecheap ✅
- www CNAME pointed to Replit app URL ✅
- Could not locate the "Verify" button in Replit — user was seeing "Republish" but no Domains tab
- **Next step**: In Replit, click **Republish** → look for a **Domains** tab at the top of the panel → enter `reviewoptic.com` and add it if not already listed → then click Verify. If still stuck, share a screenshot.

**Waiting on (external — unchanged):**
- **⚠️ Stripe live mode** — needs live keys + webhook in Replit
- **⚠️ Twilio alphanumeric sender ID "ReviewOptic"** — awaiting approval. Once approved: set `SMS_ENABLED=true`.
- **⚠️ Meta Business Verification** — still pending. Once approved: complete WhatsApp setup → set `WHATSAPP_ENABLED=true`.
- **⚠️ Meta App Review** — needed for Facebook/Instagram auto-posting. Submit after Meta Business Verification approved.

**Notes for next session:**
- **Domain verification** — finish verifying reviewoptic.com in Replit (see above)
- **Referral programme** — still pending, pure code work
- **SEO meta tags** — still pending
- **APP_URL env var** — add `APP_URL=https://reviewoptic.com` to Replit env vars if not already set
