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

*(Sessions 18–35 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-03-28 (thirty-sixth session)

**Tasks completed:**
- **Two-track follow-up system finalised**: Unrated customers get 3 generic nudges encouraging them to click a star. Customers who rated 4–5★ but haven't clicked a platform link get personalised Follow-up 1/2/3 templates. 1–3★ customers never followed up. `howtos.ts` updated to describe both tracks accurately.
- **WhatsApp opt-out text added**: Initial WhatsApp sends (routes.ts) and follow-up WhatsApp sends (storage.ts and index.ts scheduled runner) now append `\nReply STOP to opt out.` Twilio inbound webhook strips `whatsapp:` prefix to handle STOP replies for both SMS and WhatsApp.
- **Critical DNC bug fixed**: `POST /api/review-requests` now checks `customer.doNotContact` before sending — returns 400 if true. Previously DNC customers could still be sent requests.
- **Pricing page feature split**: "Multiple users & team management" removed from shared features. Lite shows it greyed out with ✗. Pro shows it highlighted with ✓. Team invite endpoint already had Lite guard server-side.
- **Trial reminder email**: New `trial_ends_at` and `trial_reminder_sent` columns on users. `trial_ends_at` saved from Stripe on billing confirm. Daily runner sends reminder email 1–3 days before trial ends (once only). `sendTrialReminderEmail` added to email.ts.
- **Subscription-ended email**: Stripe `customer.subscription.deleted` webhook now also sends `sendSubscriptionEndedEmail` — confirms billing has stopped, data retained 30 days, reactivate link.
- **T&Cs acceptance recorded**: New `terms_accepted_at` column. Register route validates `termsAccepted: true` in body (returns 400 if missing). Timestamp saved on successful registration. AuthContext and auth-types updated to pass `termsAccepted`.
- **Session cookie security**: `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"` added.
- **Rate limiting**: `express-rate-limit` added — 20 req/15min on login, register, forgot-password, reset-password.
- **Helmet security headers**: Added with CSP and COOP disabled (required for Stripe embedded checkout).
- **Cookie consent banner**: `CookieConsent.tsx` component — appears on first visit, Accept/Decline, persists to localStorage, links to Privacy Policy. Added to App.tsx.
- **Onboarding checklist**: `OnboardingChecklist.tsx` — shows on Dashboard for new owners. 4 steps: business details → review platform → add customer → send request. Each links to the right page. Auto-dismisses when all complete; X to dismiss early. Added to Dashboard above stats.
- **FAQ fully updated**: New questions on scheduled sends, two-track follow-ups, QR code, Zapier, team members (Pro-only), trial cancellation (no charge), subscription-ended confirmation email. All existing answers reviewed and corrected.
- **sendShareRatingEmail removed**: Was defined in email.ts but never called anywhere — deleted.
- **Sentry error monitoring**: `@sentry/node` installed. Init with `SENTRY_DSN` env var (no-op if not set). Captures uncaughtException, unhandledRejection, and all 500 Express errors. User has added `SENTRY_DSN` secret.
- **Resend domain verified**: `reviewoptic.com` confirmed Verified in Resend — emails will land in inboxes.
- **use-page-meta hook created**: Ready for SEO meta tags (not yet applied to pages — user wants to do this later).

**Architecture notes:**
- Trial reminder window: `trial_ends_at BETWEEN NOW() + INTERVAL '1 day' AND NOW() + INTERVAL '3 days'` — catches it on the daily run regardless of exact timing
- Cookie consent: stored in `localStorage` as `ro_cookie_consent` = `"accepted"` or `"declined"`
- Onboarding dismissed key: `ro_onboarding_dismissed` in localStorage — permanent once set
- Sentry only reports 500-level errors, not 4xx — avoids noise from validation errors

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console (SMS number + WhatsApp sender → "A message comes in")
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook` in Stripe → Developers → Webhooks, event: `customer.subscription.deleted`, add signing secret as `STRIPE_WEBHOOK_SECRET`
- **SEO meta tags**: `use-page-meta` hook is ready — user wants to apply to public pages (Pricing, FAQ, Features, Login, Register, Privacy, Terms) in a future session
- **Referral programme**: route exists (`GET /referral/:slug`), Settings tab has placeholder UI — needs offer text and refer-a-friend share link completing
- **UI polish**: user wants to perfect how the app looks — planned for a future session
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-28 (thirty-seventh session)

**Tasks completed:**
- **Subscription confirmation email**: Replaced trial reminder email entirely. New `sendSubscriptionConfirmationEmail` function fires when trial converts to paid (`invoice.payment_succeeded` webhook). Uses `subscription_confirmation_sent` DB flag (migration added) to ensure exactly one email per subscription. Warm encouraging tone: "Welcome to the team! 🎉", receipt box with plan/billing/amount/next date, "View receipt →" and "Manage billing" buttons.
- **Trial reminder runner removed**: `runTrialReminders` function and interval completely removed from index.ts. `sendTrialReminderEmail` removed from email.ts. `trial_reminder_sent` column kept in DB (no harm, just unused).
- **All platform emails rewritten for warm/friendly tone**:
  - Verification: "Welcome — you're one step away! 👋", mentions 14-day free trial, CTA updated to "Verify email & start free trial"
  - Team invite: "You're in — welcome to the team! 🎉", brief description of ReviewOptic, CTA "Accept invitation & get started"
  - Cancellation: "We're sad to see you go 💙", warmer copy, sign-off changed from "The ReviewOptic team" to "Alicia & Rob — ReviewOptic"
  - Subscription-ended: Billing-stopped confirmation tick ✅, hopeful reactivation message, personal sign-off
  - Subscription confirmation: Already warm from previous session — sign-off updated to match
- **Confirmed QR code and Zapier webhook are fully built** — both exist in routes.ts and Settings.tsx. Session notes from previous sessions were incorrect to list these as pending.
- **Confirmed `POST /api/reviews` orphan already removed** — only a GET exists, which is legitimate.

**Architecture notes:**
- `invoice.payment_succeeded` event: only sends confirmation when `amount_paid > 0` AND `billing_reason !== "subscription_create"` — avoids firing on the initial subscription setup invoice
- `subscription_confirmation_sent` flag: uses `UPDATE ... WHERE ... RETURNING` as an atomic check-and-set — prevents double-sends even if webhook fires twice
- Stripe webhook now handles TWO events: `customer.subscription.deleted` (cancellation email) + `invoice.payment_succeeded` (confirmation email)

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Referral programme**: needs completing (offer text, share link, `referred_by_account_id` on registration, admin view)
- **SEO meta tags**: `use-page-meta` hook ready, not yet applied to public pages
- **UI polish**: deferred by user
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-28 (thirty-eighth session)

**Tasks completed:**
- **Privacy Policy DPA notes completed**: Added full GDPR-compliant + DPA language for Neon, Twilio, and Sentry. All five processors (Resend, Stripe, Neon, Twilio, Sentry) now have consistent DPA notes. Sentry added as a new entry (was missing entirely).
- **Privacy Policy logo removed**: Logo image removed from the Privacy Policy page — cleaner, more document-like appearance.
- **Terms & Conditions logo resized**: Logo increased from `h-16` to `h-28` to match the Dashboard logo size.

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Referral programme**: needs completing (offer text, share link, `referred_by_account_id` on registration, admin view)
- **SEO meta tags**: `use-page-meta` hook ready, not yet applied to public pages
- **UI polish**: deferred by user
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-29 (thirty-ninth session)

**Tasks completed:**
- **Checkout 401 — login session not explicitly saved**: The login route set session data but relied on express-session's automatic save. If the PostgreSQL write hadn't finished before the client's next request (checkout), the session wasn't found → 401. Fixed: added explicit `await req.session.save()` to login and verify-email routes, matching what register already did.
- **Checkout 401 — requiresVerification flow navigating to /pricing**: When a previously-registered-but-unverified email tried to register again, the server returned `{requiresVerification: true}` with NO session. The client was ignoring this and navigating to /pricing anyway, with a fake user object → checkout 401. Fixed: `AuthContext.register()` no longer calls `setUser()` for requiresVerification responses; `Register.tsx` now shows "check your inbox" message instead of navigating.
- **Billing confirm crashing — missing DB columns**: `trial_ends_at`, `trial_reminder_sent`, and `subscription_confirmation_sent` columns were defined in migrate.ts but had never been applied to the live database. The billing confirm route was trying to write to `trial_ends_at` → SQL error → payment confirm failed. Fixed: ran the three `ALTER TABLE` statements directly against the database.
- **Billing confirm behind requireAuth**: After Stripe redirects back to `/billing/success`, the session cookie might not be present in the browser context in time, causing confirm to return 401. Fixed: removed `requireAuth` from the confirm route — the Stripe `session_id` itself is cryptographic proof of payment, and the `userId` comes from Stripe-stored metadata (server-controlled). Added full try-catch with logging.
- **Session debug logging added**: `requireAuth` now logs `sessionID`, `hasCookie`, `userId`, `accountId` when returning 401 — makes future session issues easy to diagnose.
- **BillingSuccess shows real error message**: Error state now captures and displays the actual server error message, not just a generic string — critical for diagnosing payment issues.

**Architecture notes:**
- Billing confirm is now auth-free — security relies on Stripe's `session_id` being unguessable + `userId` coming from server-stored Stripe metadata, not client input
- All session-setting routes (register, login, verify-email, accept-invite) now explicitly await `req.session.save()` before responding

**Notes for next session (carried forward):**
- **✅ CHECKOUT CONFIRMED WORKING** — tested end-to-end in session 40 — the DB column fix should unblock it, but needs a clean test run (register → pricing → checkout → billing/success) to confirm it works completely
- **⚠️ Remove or gate the session debug logging in requireAuth** before going to production (or leave it — it only fires on 401s)
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Referral programme**: needs completing
- **SEO meta tags**: `use-page-meta` hook ready, not yet applied to public pages
- **UI polish**: deferred by user
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern from this session (select by email, delete by account_id in dependency order)

### Session — 2026-03-29 (fortieth session)

**Tasks completed:**
- **Checkout confirmed working** — clean end-to-end test passed: register → pricing → Stripe test card → billing/success → dashboard
- **Intro video modal disabled** — commented out the trigger in Dashboard.tsx. All code kept; uncomment + add `INTRO_VIDEO_URL` to re-enable when ready
- **Login page copy updated** — tagline now says "automatically collect more reviews" instead of "without any manual effort"; platform list expanded to "and more"
- **Voice & video USP added to login page** — second feature card: "Personal voice & video messages"
- **Revenue impact stat added to login page** — top feature card: "A one-star improvement in your Google rating can increase revenue by up to 9%"
- **Service recovery feature added to login page** — "Turn unhappy customers into loyal ones" feature card
- **Social auto-posting added to login page** — "Auto-post reviews to Instagram, Facebook, and LinkedIn" (live when feature is ready)
- **Features page logo enlarged** — h-20 → h-28
- **Features page: Voice & Video category added** — new section with 4 bullet points
- **Features page: Standard plan label updated** — "Lite plan" → "Standard plan"
- **Pricing page: both Get Started buttons now blue** — was outline/default depending on highlight; now both `variant="default"`
- **FAQ: service recovery reframe** — "star rating pre-screen" renamed to "How does service recovery work?"; both that answer and private feedback answer rewritten to lead with catching unhappy customers before they post publicly
- **FAQ: monthly reset corrected** — "1st of each calendar month" → "beginning of each billing cycle"
- **FAQ: customer import mentions Zapier** — added note that Zapier auto-adds customers from booking systems
- **FAQ: CTA banner added at bottom** — blue banner linking to /register: "Ready to start collecting more reviews? Start your 14-day free trial today"
- **Lite plan renamed to Standard everywhere** — display labels updated across Pricing, Billing, FAQ, Features, T&Cs, CustomerDetail, Customers, Admin. Internal DB value `"lite"` and all code comparisons unchanged
- **Confirm email field added to Register page** — catches typos (e.g. gmaail.com); both fields must match before submission; error: "Email addresses do not match — please check and try again"

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **⚠️ STRIPE WEBHOOK NOT YET REGISTERED** — must register `https://reviewoptic.com/api/billing/webhook`, select BOTH `customer.subscription.deleted` AND `invoice.payment_succeeded`, add `STRIPE_WEBHOOK_SECRET`
- **Referral programme** — needs completing
- **SEO meta tags** — `use-page-meta` hook ready, not yet applied to public pages
- **UI polish** — deferred by user
- **Intro video** — add YouTube URL to `INTRO_VIDEO_URL` (line 74, Dashboard.tsx) and uncomment the useEffect body to re-enable
- **Social auto-posting** — feature card is live on login page; needs the actual feature built before going live
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- To delete a test account: use the node script pattern (select by email, delete by account_id in dependency order)

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

