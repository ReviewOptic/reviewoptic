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

*(Sessions 18–40 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-03-30 (forty-first session)

**Tasks completed:**
- **Cancel subscription — modal dialog**: Cancel now opens as a pop-up modal (not inline). Shows clear copy: full access until billing period end, then analytics-only (no new customers, no sending requests). Requires password to confirm.
- **Delete account — modal dialogs**: Two-step modal flow. Step 1: warning about permanent deletion. Step 2: password entry. Password verified via bcrypt server-side before proceeding.
- **Delete account — confirmation email**: `sendAccountDeletionEmail` added to email.ts. Fires immediately on deletion with the 30-day purge date.
- **Cancellation email updated**: Now explicitly states what access remains after billing period ends (analytics OK, no new customers/requests).
- **Subscription-ended email updated**: Now includes the billing period end date (passed from Stripe webhook `current_period_end`).
- **Access enforcement tightened**: Cancelled accounts now also blocked from `POST /api/customers` (adding new customers), not just sending requests. Team members inherit parent account restrictions via the existing owner-plan check.
- **Admin panel — Cancelled tab**: New tab showing full list of cancelled accounts (email, name, company, plan, customers, requests, cancel date) for reactivation outreach. CSV export included.
- **Admin panel — Deleted tab**: New tab showing anonymised audit log of accounts scheduled for deletion (dates only, no personal details).
- **Server endpoints**: `GET /api/admin/cancelled-accounts` and `GET /api/admin/deleted-accounts` added.
- **4–5★ template default text updated**: New text: "Thank you for your rating. Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{business_name}}" — applied to new account creation and reset-to-defaults endpoint.
- **Cancel/delete button layout**: Both buttons sit on the same row (Cancel left, Delete right) in the billing page idle state.

**Architecture notes:**
- Cancel flow: `cancelStep` state (`"idle" | "confirm"`) drives the Dialog open state. Password sent with `POST /api/billing/cancel`, verified via bcrypt before Stripe call.
- Delete flow: `deleteStep` state (`"idle" | "confirm" | "final"`) drives two sequential dialogs. Password sent with `DELETE /api/account`, verified via bcrypt before proceeding.
- Cancelled tab query: `WHERE plan_type = 'cancelled' AND role = 'owner' AND scheduled_for_deletion_at IS NULL` — excludes accounts that have requested deletion.
- Deleted tab query: `WHERE scheduled_for_deletion_at IS NOT NULL AND role = 'owner'` — returns dates only.

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Social auto-posting** — feature card is live on login page; needs the actual feature built before going live
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern (select by email, delete by account_id in dependency order)

### Session — 2026-03-30 (forty-second session)

**Tasks completed:**
- **Deletion email reactivation link**: `sendAccountDeletionEmail` now accepts a `reactivateUrl` parameter (passes `/pricing`). Email clearly states: account deleted now, data permanently removed on [purge date], blue "Reactivate my account" button, note that after that date data cannot be recovered.
- **Reactivation actually clears deletion flag**: `billing/confirm` route now includes `scheduled_for_deletion_at = NULL` in the UPDATE. If a user clicks the reactivation link, logs in, and completes payment, the deletion is cancelled and their account is fully restored. Subscription confirmation email fires via existing Stripe webhook.
- **Cancellation email flow confirmed correct**:
  - Email 1 (immediate): fires from `POST /api/billing/cancel` — confirms cancellation, states access end date, has reactivation button.
  - Email 2 (end of period): fires from `customer.subscription.deleted` Stripe webhook — confirms billing stopped, includes the period end date.
  - ⚠️ Email 2 requires the Stripe webhook to be registered (still pending).

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET` — without this, end-of-period cancellation email and subscription confirmation email will NOT fire
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Social auto-posting** — feature card is live on login page; needs the actual feature built before going live
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern (select by email, delete by account_id in dependency order)

### Session — 2026-03-30 (forty-third session)

**Tasks completed:**
- **Analytics active state colours**: Period pills (7d/30d/60d/All time/Custom), channel toggles, Colours button, and Layout button now all use the user's chosen chart colour scheme (`colors.requests`) instead of hardcoded gold/amber. `activeStyle` inline style derived from `useChartColors()`. Works on mobile and desktop.
- **Analytics: All time filter added**: New `"all"` period option passes `days=all` to backend; server uses `cutoff = new Date("2000-01-01")` to return all data.
- **Customers mobile scroll fixed**: Status badge column hidden on mobile (`hidden sm:table-cell`); status badge now shown under the customer name (same pattern as email). Table fits on 375px without horizontal scroll.
- **Templates tab restructure**: Split into 5 tabs — Ratings | Email | SMS | WhatsApp | Recordings. Ratings tab shows `response_positive` (4-5★) and `response_negative` (1-3★) once (channel-agnostic, uses email channel data). Email/SMS/WhatsApp tabs show follow-ups only + custom templates. Tab bar replaced with plain inline buttons (no full-width highlighted background), sits flush left with a bottom border separator.
- **Email templates: no character limit**: Char counter hidden for email channel — only shown for SMS (with max chars) and WhatsApp.
- **Recordings: Upload file button added**: Both Voice Notes and Video Messages now show Record + Upload file buttons in idle state. File input accepts `audio/*` / `video/*` and goes through the same save flow.
- **Recordings: iOS Safari fix**: Removed hardcoded `audio/webm` and `video/webm` MIME types from `MediaRecorder` — browser now picks its own supported format (`audio/mp4` on iOS). Blob type uses `mr.mimeType` fallback. Filename extension derived from actual MIME type.

**Architecture notes:**
- `TEMPLATE_SLOTS` split into `RATING_SLOTS` and `FOLLOWUP_SLOTS` — Ratings tab uses `RATING_SLOTS` with `channel="email"`, follow-up tabs use `FOLLOWUP_SLOTS` per channel.
- `activeStyle: CSSProperties = { backgroundColor: colors.requests, borderColor: colors.requests, color: "#fff" }` — defined in Analytics component body, passed as inline style to all active states.

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Social auto-posting** — feature card is live on login page; needs the actual feature built before going live
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern (select by email, delete by account_id in dependency order)


### Session — 2026-03-30 (forty-fourth session)

**Tasks completed:**
- **Add to Home Screen / PWA setup**: `manifest.json` created in `client/public/` — sets app name, theme colour (`#0E679D`), and square icon. `apple-touch-icon` and `<link rel="manifest">` added to `index.html`. App now shows ReviewOptic icon when saved to home screen on iPhone (Safari) and Android (Chrome). Opens full screen with no browser bar.
- **Square app icon**: `reviewoptic icon only - square - app.png` uploaded to `client/public/` — icon-only version (no wordmark), fills the square well. Both `manifest.json` and `index.html` point to it.
- **Tutorials → How-to's**: New entry "How to save ReviewOptic to your phone as an app" — step-by-step for iPhone (Safari) and Android (Chrome).
- **Tutorials → Top Tips**: New tip "Use ReviewOptic as an app on your phone" — added at top of tips list.
- **Features page**: New "Mobile & Access" category — 5 bullet points covering mobile optimisation and Add to Home Screen.
- **Login page**: New feature card "Fully optimised for mobile" with Add to Home Screen mention.
- **Full mobile audit + fixes**:
  - **Register.tsx**: First/last name row stacks to single column on mobile (`flex-col sm:flex-row`)
  - **Settings.tsx**: Company Name / Your Name fields restructured — label stays above its own input when stacked; cropper height `h-40 sm:h-56`; logo upload section stacks vertically on mobile
  - **Dashboard.tsx**: Alert nudge cards stack text above View button on mobile
  - **Billing.tsx**: Cancel and Delete modal button rows stack vertically on mobile (`flex-col sm:flex-row`)
  - **Layout.tsx**: Floating tutorial panel initial position clamped to always be on-screen on small devices

**Architecture notes:**
- PWA: `client/public/manifest.json` with `display: standalone` — no browser bar when opened from home screen
- `apple-touch-icon` → iOS; `manifest.json` → Android/Chrome
- App icon: `client/public/reviewoptic icon only - square - app.png`

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Mobile test** — user to test on real phone and report any remaining issues
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Social auto-posting** — feature card is live on login page; needs the actual feature built before going live
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern (select by email, delete by account_id in dependency order)

### Session — 2026-03-30 (forty-fifth session)

**Tasks completed:**
- **Performance fix — Dashboard stat cards**: `transition-all` replaced with `transition-[filter]` on all 4 stat card hover effects — reduces repaints, improves desktop rendering smoothness.
- **Settings page width fix**: Container changed from `max-w-3xl` to `max-w-5xl` to match other pages — was appearing narrower/shrunk on desktop.
- **Business logo in Dashboard header**: Logo from user's settings now shows top-right of Dashboard header (hidden on mobile with `hidden sm:block`, `max-w-[160px]`, `loading="lazy"`). Only renders if `settings.logoUrl` is set.
- **hello@reviewoptic.com — undeletable**: Server-side 403 guard added to `DELETE /api/account` — admin account can never be accidentally deleted.
- **Deleted all test accounts**: All non-admin accounts removed from DB. Only `hello@reviewoptic.com` remains.
- **Admin panel — removed hello@reviewoptic.com from Users list**: Filter applied client-side so admin account is invisible in Users tab and excluded from counts.
- **Admin panel — Users table overflow fix**: Table wrapped in `overflow-x-auto` div, `min-w-[700px]` on table, column headers shortened ("Customers"→"Custs", "Requests"→"Reqs", "Verified"→"Ver."), padding reduced.
- **Soft-delete for customers**: Deleting a customer now sets `deleted_at` timestamp instead of hard-deleting. Purge cron runs hourly, removes records older than 30 days. Customer stats/ratings preserved throughout.
- **Deleted customers view**: New "Deleted" button in Customers header. Deleted view shows customers with purge date and a "Reactivate" button. Back button returns to All Customers. Empty states customised for deleted view.
- **Schema + migration**: `deleted_at TIMESTAMP` column added to customers table. `font_family TEXT DEFAULT 'Inter'` added to settings.
- **Removed Instagram auto-posting**: All IG posting code removed from server. Settings.tsx, Login.tsx, PrivacyPolicy.tsx all updated. Facebook auto-posting retained.
- **Stripe webhook event fix**: Server now handles both `invoice.paid` and `invoice.payment_succeeded`.
- **App font changed to Lexend**: `--font-sans` CSS variable updated. Google Fonts link updated to load only Lexend. Per-user font picker removed from Settings.
- **Dashboard mobile quick links**: All 5 links fit in single row using `gridTemplateColumns: repeat(N, 1fr)` — smaller icons, smaller text, tighter padding.

**Architecture notes:**
- Soft-delete: `getCustomers` and `getArchivedCustomers` both filter `deleted_at IS NULL`. `getDeletedCustomers` returns `deleted_at IS NOT NULL`. `deleteCustomer` sets timestamp; `reactivateCustomer` sets null.
- Admin guard: `hello@reviewoptic.com` blocked at server (403) and excluded client-side in Admin.tsx.
- Font: CSS var `--font-sans: "Lexend", sans-serif` in index.css. Google Fonts loads `family=Lexend:wght@100..900`.

**Notes for next session:**
- **⚠️ TWILIO UPGRADE NEEDED** — alphanumeric sender ID "ReviewOptic" for SMS, WhatsApp Business setup (remind every session)
- **⚠️ STRIPE WEBHOOK** — was walked through setup; verify `invoice.paid` and `customer.subscription.deleted` are both active and `STRIPE_WEBHOOK_SECRET` env var is set
- **APP_URL env var** — add `APP_URL=https://reviewoptic.com` to Replit env vars (required for Facebook/LinkedIn OAuth callbacks to work)
- **Facebook/LinkedIn OAuth redirect URIs** — register `https://reviewoptic.com/auth/facebook/callback` and `https://reviewoptic.com/auth/linkedin/callback` in Meta and LinkedIn developer portals
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern (select by email, delete by account_id in dependency order)

### Session — 2026-03-30 (forty-sixth session)

**Tasks completed:**
- **Settings tab navigation bug fixed**: Converted `<Tabs>` from uncontrolled (`defaultValue`) to controlled (`value` + `onValueChange`). Tab clicks now update `activeTab` state AND sync the URL via `navigate("/settings?tab=X", { replace: true })`. This eliminates any edge-case where the uncontrolled component could get out of sync.
- **Settings broken link fixed**: `<a href="/?tab=templates">` in Follow-Ups tab was navigating to Dashboard (the `/` route). Fixed to `<a href="/templates">`.
- **Customers URL filter sync fixed**: `statusFilter` state now initialised from `window.location.search` (`?status=X` param) and filter button clicks update the URL with `navigate("/customers?status=X", { replace: true })`. URL now always matches the active filter.
- **Admin metrics reset**: Truncated `activity_log`, `user_sessions`, and cleared orphaned customer records. DB is now fully clean and ready for real users.

**Architecture notes:**
- Settings tab: `activeTab` state + `onValueChange` → `navigate("/settings?tab=X", { replace: true })`. Route still matches `/settings` since wouter matches on path, not search params. No remount on tab change.
- Customers filter: initialised from `window.location.search` at mount time. Filter click updates state + URL.

**Notes for next session:**
- **⚠️ STRIPE WEBHOOK** — verify `invoice.paid` and `customer.subscription.deleted` are both active and `STRIPE_WEBHOOK_SECRET` env var is set
- **APP_URL env var** — add `APP_URL=https://reviewoptic.com` to Replit env vars (required for Facebook/LinkedIn OAuth callbacks to work)
- **Facebook/LinkedIn OAuth redirect URIs** — register `https://reviewoptic.com/auth/facebook/callback` and `https://reviewoptic.com/auth/linkedin/callback` in Meta and LinkedIn developer portals
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

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
