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

*(Sessions 18–104 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-06-30 (one-hundred-and-fifth session)

**What was built/fixed this session:**

1. **Facebook App Review approved** — app is Live, all permissions granted (`pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_content_publish`, `business_management`). Social posting to Facebook and Instagram now available to all users.

2. **Facebook review fetching added (`server/externalReviews.ts`)** — `fetchFacebook()` calls `/{pageId}/ratings` Graph API using stored page access token. Handles star ratings and recommendation_type (positive=5★, negative=1★), paginates up to 5 pages, captures `rating_count` for Total Reviews stat. Wired into the hourly poll alongside other platforms.
   - **Deprioritised:** `pages_read_user_content` was not in the approved permissions — reviews may not come through. Left in place, will revisit if there's demand or if existing permissions prove sufficient.

3. **Google GBP OAuth quota increase submitted** — quota was still 0. Submitted increase request via Google Cloud Platform Trust & Safety form (2026-06-30, expects 2 business days). Also submitted case 1-6925000040797 for API access (expected ~2026-07-07). Improved GBP OAuth error message to distinguish quota errors from "no account found" (`server/routes.ts`).

4. **QA audit and fixes (`server/storage.ts`, `server/routes.ts`, `client/src/pages/Settings.tsx`):**
   - `getAdminUserStats()`: was making 3 DB queries per user (N+1). Replaced with single JOIN query.
   - `getStats()`: was loading ALL customers into memory then filtering in JS. Replaced with SQL COUNT queries.
   - `sendFollowUps()`: was querying review requests once per customer inside a loop. Now batch-fetches all requests before the loop, groups into a Map by customerId. Logic and ordering verified correct.
   - `POST /api/customers`: added try-catch — now returns friendly 500 instead of crashing.
   - `PATCH/DELETE /api/customers/:id` and reactivate: same error handling added.
   - Removed unused imports: `sendWhatsAppMessage` (storage.ts), `Mic` and `Video` (Settings.tsx).

**NEXT SESSION — FIRST STEPS:**
1. **Check Google GBP quota** — Trust & Safety response expected ~2026-07-02. If approved, test Connect Google Business Profile button.
2. **Check Google API access case 1-6925000040797** — expected ~2026-07-07.
3. **Plan beta testing** — identify 2-3 real small businesses to test the app before opening to paying customers.

**Pending:**
- **Google Business Profile API access** — case **1-6925000040797**, submitted 2026-06-24, expected ~2026-07-07
- **Google GBP OAuth quota increase** — submitted to Trust & Safety 2026-06-30, expected ~2026-07-02
- **Google OAuth scope verification** — submit once GBP OAuth confirmed working for all users
- **Facebook review fetching** — code in place, may need `pages_read_user_content` App Review; not urgent
- **Beta testing** — next logical step before paying customers
- **Landing page videos**, **tracking pixel IDs**, **first blog post** — deferred until ready for public traffic

### Session — 2026-07-01 (one-hundred-and-sixth session)

**Context:** Google's quota increase (case 1-6925000040797) came through — GBP OAuth API access approved, quota set to 300 req/min. Rest of session spent getting real reviews flowing end-to-end and fixing bugs surfaced along the way.

**Fixes applied:**

1. **Google Business Profile location lookup bug (`server/routes.ts`)** — the OAuth callback was calling the wrong Google API to look up the user's business location (`mybusinessaccountmanagement.googleapis.com` instead of `mybusinessbusinessinformation.googleapis.com` — Google splits these into separate services). This produced an invalid location resource ID, causing every reviews fetch to 404. Fixed to call the correct API with the required `readMask` param, and build the resource name correctly as `accounts/{id}/locations/{id}`.

2. **Google GBP total count (`server/externalReviews.ts`)** — `fetchGBP()` never returned `platformTotal`, so Google never contributed to the "Total Reviews" stat even when connected. Now reads `data.totalReviewCount` from the v4 API response.

3. **GBP error messages now show Google's real reason (`server/externalReviews.ts`)** — was just showing the HTTP status code (e.g. "403"). Now parses and surfaces Google's actual `error.message`, which is how we discovered the real blocker below.

4. **Discovered: "Google My Business API" (legacy v4, used for reviews) is a separate product from "Google Business Profile API"** in Google Cloud Console, and Google has hidden it from the API Library for new projects — it can't be self-service enabled no matter how you search. Confirmed via direct testing that even a properly-formed request 403s with "API has not been used in project ... or it is disabled," and it's absent from the Enabled APIs list and from Library search results entirely. User emailed Google support (via the same channel as the approved case 1-6925000040797) asking them to enable `mybusiness.googleapis.com` directly. **This is now a Google-side blocker, not a code issue — nothing more to do until they respond.**

5. **Google now falls back gracefully (`server/externalReviews.ts`)** — while GBP reviews are blocked, the Google fetcher automatically falls back to the Places API (already enabled, gives a real `user_ratings_total`) instead of just failing. So the Total Reviews stat still works for Google right now, and it'll automatically start using full GBP data the moment Google enables the legacy API — no user action needed either way.

6. **Checkatrade investigated** — direct testing (fetching their live page with browser headers) showed Checkatrade has fully redesigned their site: reviews and review counts are no longer in the server-rendered HTML at all, loaded by client-side JS instead. Our scraper can't see any review data anymore for that reason (not a regex bug). A headless-browser fix was attempted (`puppeteer-core` + `@sparticuz/chromium`, chosen for the autoscale deployment target) but hit a missing system library (`libnspr4.so`) on first test — user then reconsidered and deprioritised it (see below), so **packages were uninstalled and the attempt abandoned**, not shipped.
   - **Note:** user separately reported Checkatrade still shows ~6 individual reviews pulling through in production, suggesting the redesign may be a partial/gradual rollout — worth re-testing before writing this off entirely.

7. **New "reviews gained since joining" feature** — after discussing that full review-content scraping isn't core to the product (ReviewOptic's job is generating reviews via requests, not archiving them), landed on a simpler approach:
   - Added a manual "Total existing reviews (all platforms) — required" field in Settings → Review Platforms (`starting_review_count` column in `ext.settings_extra`, new endpoint `POST /api/settings/starting-review-count`).
   - Added to the onboarding checklist (`OnboardingChecklist.tsx`) as a required step.
   - Dashboard now shows "+X since joining" under Total Reviews = current total minus that manual number (`gainedSinceJoining` in `GET /api/external-reviews`).
   - This is framed as **growth evidence, not causal attribution** — we cannot know which specific review came from a ReviewOptic request (no platform exposes that link).
   - **User flagged this added too much friction/complexity in-session** — leaning toward simplifying further (e.g. making it optional, not required) next time. Revisit before assuming this is the final design.

8. **Dashboard feed capped to 20 most recent reviews (`server/routes.ts`)** — was showing every imported review; "Total Reviews" stat is unaffected (computed via separate COUNT query + platform totals, not the capped list).

9. **Refresh popup now copyable (`client/src/pages/Dashboard.tsx`)** — "Refresh now" results were a native `alert()`, which the user couldn't select/copy text from (needed to paste Google's error message to me). Replaced with an in-page `Dialog` containing a read-only textarea + Copy button.

**IMPORTANT — engineering environment note:** the sandbox's Nix store mount broke mid-session (`Transport endpoint is not connected`), taking out `node`/`npm`/`npx` entirely. `git` still worked via `GIT_CONFIG_NOSYSTEM=1` (bypasses reading `/etc/gitconfig`, which is symlinked into the broken mount) — use that workaround if this happens again. Could not run a final type-check after the last edit of the session (Google fallback fix) for this reason — the change is small and type-safe (both branches return `Promise<FetchResult>`) but hasn't been machine-verified.

**NEXT SESSION — FIRST STEPS:**
1. **Check for a reply from Google support** re: enabling `mybusiness.googleapis.com` (the legacy "Google My Business API") for the project — this is the one remaining blocker on full GBP reviews.
2. **Run a type-check** (`npx tsc --noEmit`) to verify the last edit of this session (Google fallback in `externalReviews.ts`) — wasn't machine-verified due to the Nix mount outage above.
3. **Revisit "reviews gained since joining"** — user found the required manual field added too much friction. Consider making it optional rather than a blocking onboarding step.
4. **Re-test Checkatrade** — user saw ~6 reviews still pulling through in production after I found the site apparently redesigned with no scrapable data. Worth checking directly again before deciding this platform is a dead end.

**Pending:**
- **Google "Google My Business API" enablement** — hidden from self-service API Library, user emailed Google support to enable it directly for project 1097305399176 (referencing approved case 1-6925000040797)
- **Google OAuth scope verification** — submit once GBP OAuth confirmed working for all users
- **Checkatrade scraping** — site redesign broke it; automated total/detail scraping may not be worth pursuing further (see note above re: partial rollout)
- **"Reviews gained since joining" UX** — simplify per user feedback (make optional, not required)
- **Facebook review fetching** — code in place, may need `pages_read_user_content` App Review; not urgent
- **Beta testing** — next logical step before paying customers
- **Landing page videos**, **tracking pixel IDs**, **first blog post** — deferred until ready for public traffic

### Session — 2026-07-14 (one-hundred-and-seventh session)

**Context:** User did a full manual pass through every email template in the admin panel and flagged a long list of issues in rapid succession. Also covered signup/verification/billing workflow logic and an accuracy audit of the AI insights email. Files touched: `server/email.ts`, `server/systemEmailTemplates.ts`, `server/routes.ts`, `server/index.ts`, `server/storage.ts`, `server/insightEmail.ts`, `client/src/App.tsx`. Full `npx tsc --noEmit` run clean at the end — only 4 pre-existing, unrelated errors remain (routes.ts stripe/Set-iteration/index-type issues, Analytics.tsx/Blog.tsx/Settings.tsx type mismatches — none touched this session).

**Email content fixes:**
1. Removed the pale-grey "Alicia & Rob — ReviewOptic" footer `<p>` that appeared at the bottom of 8 emails (cancellation, subscription-ended, account-deletion, subscription-confirmation, renewal-reminder, payment-failed, incomplete-registration, referral-reward).
2. ReviewOptic logo now hardcoded to link to `https://www.reviewoptic.com` (was linking to `APP_URL`, which resolves to the Replit dev domain in this environment — logo was pointing at a dev URL during testing).
3. Star ratings shown as real ⭐ emoji instead of the word "star" — applies to the "new rating received" notification (4–5★ only; below 4★ still shows no stars, just "left private feedback") and the private-feedback notification. 5-star ratings get a 🎉 in the subject.
4. "New rating received" email (4–5★ case): removed "Head to your customers page" wording and the "View in ReviewOptic" button, added a green "🎉 Congratulations!" banner, new copy "ReviewOptic is working hard to get this rating published on one of your review platforms." (Low-rating/private-feedback branch unchanged — still shows the button, since they need to actually log in and respond.)
5. Private-feedback email: now says "Log in to read & respond," links to `${appUrl}/#private-feedback` (the dashboard's feedback card anchor) instead of just the bare app root.
6. Team invite: "genuine reviews" → "⭐⭐⭐⭐⭐ reviews" to match homepage/login-page copy which already says "5-star reviews" (the literal phrase "5 star" the user described didn't actually exist in the code anywhere — closest match was this).
7. Password reset: expiry changed from 1 hour → 15 minutes (both the actual token TTL in `storage.ts` `createResetToken()` and the email wording).
8. Subscription confirmation: removed "Welcome to the team" heading (now "Your subscription is now active") and removed the "reply to this email with questions" line.
9. Referral reward email: "credit" language → "you've earned a free month" — the underlying Stripe logic (`stripe.customers.createBalanceTransaction`, applies automatically to next invoice) was already correct; this was wording-only.
10. Subscriber review-request (the "how are you finding ReviewOptic" 1–5★ ask) pushed from 30 days → 2 months after signup, wording updated to match.

**Reply-to behaviour (SMTP header, not visible in admin panel):**
- Only **cancellation** and **subscription-ended** emails now reply to `hello@reviewoptic.com` — these are the only two that explicitly invite feedback ("just hit reply"). Initially applied this to all 16 ReviewOptic-branded emails, then walked it back per explicit correction — everything else sends from/replies to `noreply@reviewoptic.com` as before.
- Removed reply-inviting wording from subscription-confirmation and incomplete-registration emails (they don't have the reply-to set, so shouldn't invite replies either).

**Behavioural/workflow changes:**
- **Email verification now actually gates the dashboard.** Previously `client/src/App.tsx`'s `ProtectedRoutes` only checked `user.requiresPayment`, not `user.emailVerified` — so a user who paid but hadn't clicked their verification link yet could already see the dashboard. Added a `VerifyEmailPrompt` component (reuses the existing "check your email" messaging/resend button already built for `BillingSuccess.tsx`) shown whenever `!user.emailVerified`, regardless of how/when they log back in. Login itself is still NOT gated on verification (intentional — someone who registers but hasn't paid yet needs to be able to log back in to reach the payment page, since verification email only sends after payment is confirmed).
- **Signup/trial/billing workflow verified against user's stated requirements** (card required before signup completes, 30-day trial then auto-charge, no auto-cancel, late cancellation defers to end of already-paid period) — all of this was **already correctly implemented**, no changes needed. Verification email genuinely only sends after Stripe payment confirms (`routes.ts` `/api/billing/confirm`); cancellation always uses `cancel_at_period_end: true`; the only automatic cancellation is a safety net for 2+ failed payments, not trial expiry.
- **Renewal reminder emails removed entirely** — deleted the `invoice.upcoming` Stripe webhook handler block that triggered `sendRenewalReminderEmail`. The function/template/admin-test-button still exist (dormant, testable) but nothing fires it automatically anymore.
- **Removed duplicate "please review ReviewOptic" automated email.** There were two separate cron-driven flows both asking ReviewOptic subscribers to rate ReviewOptic around the 30-day mark: `runPlatformReviewRequests` (direct Google/Trustpilot link buttons) and `runSubscriberReviewRequests` (1–5★ tap-to-rate, built on ReviewOptic's own review-request system). Removed the automatic trigger for the former (deleted the whole `runPlatformReviewRequests` function + its `setInterval` + the now-unused `sendPlatformReviewRequest` import in `index.ts`), kept the latter since it's more integrated (dogfoods ReviewOptic's own product).

**Two real bugs found and fixed — admin panel templates weren't reflecting reality:**
- `sendResetPasswordEmail` and `sendPrivateFeedbackNotificationEmail` were **completely hardcoded**, ignoring `getEmailTemplateOverride()` entirely — editing those templates in the admin panel had zero effect on the actual email sent. Both now properly check for a DB override like every other system email.
- The admin "Test" button's `private_feedback` case in `routes.ts` had its own separate, stale, hand-duplicated copy of the email HTML instead of calling the real `sendPrivateFeedbackNotificationEmail()` function — explains why test sends didn't match the real template. Fixed to call the real function.
- **Found while syncing wording to the admin panel defaults:** if an admin customized the `private_feedback` template, the customer's actual written feedback message was never passed into the template renderer — it would silently disappear from the email. Fixed by adding `{{message}}` as a proper merge variable (now in `DEFAULT_EMAIL_TEMPLATES.private_feedback.variables` and wired into the `renderBodyHtml()` call). Also added a `{{stars}}` merge variable to both `rating_notification` and `private_feedback` so admin-customized text can show real star emoji, not just the raw number.

**IMPORTANT — architecture note on admin-panel/code sync:** `DEFAULT_EMAIL_TEMPLATES` in `systemEmailTemplates.ts` is a SEPARATE copy of "default" text from the hardcoded fallback strings inside each `send*Email()` function in `email.ts`. The admin panel editor shows/edits the `systemEmailTemplates.ts` copy; the actual send functions use their own inline hardcoded fallback when no DB override exists, and only reach for the DB override (not the `systemEmailTemplates.ts` default directly) when one has been saved. **Any wording change made in `email.ts` must be manually mirrored into `systemEmailTemplates.ts`'s `DEFAULT_EMAIL_TEMPLATES` or the admin panel will show stale text that doesn't match what's actually sent.** This bit us twice this session (rating_notification, private_feedback) and was only caught because the user explicitly asked whether the admin panel reflected the changes. **Also found: the `insight` email (weekly/monthly AI stats report) is entirely self-contained in `insightEmail.ts` and does NOT use `DEFAULT_EMAIL_TEMPLATES.insight` / `getEmailTemplateOverride()` at all — that admin panel entry is fully decorative/dead. Not fixed this session (would require a bigger redesign of the insight email's rendering, which is table/stat-block based, not plain paragraph text) — flagged to user, no decision made yet on whether to wire it up or remove the dead admin entry.**

**Insights email accuracy audit (user asked: "are these completely accurate and legitimate?"):**
- Confirmed data is genuinely real (real SQL against the account's actual `reviews`/`review_requests`/`customers` tables) and the "AI insights" are a genuine GPT-4o-mini call fed real numbers — not fake/templated.
- Fixed: conversion rate was comparing two unrelated things (all reviews from any source, including unattributed external Google imports, against requests sent that same calendar month). Now it's a true cohort rate: of the requests sent this period, what % have received a direct response via ReviewOptic's own rating form, however long that took.
- Fixed: "best day to send" was using a rolling 30-day window while every other stat used the calendar month — now consistent.
- Fixed: softened the AI prompt so hardcoded industry benchmark numbers (e.g. "plumbers average 4.4–4.8★") are treated as general guidance, not stated as verified fact.
- **Deliberately left alone per user instruction:** the rating-breakdown chart only counts ratings submitted directly through ReviewOptic's own form (not external platform reviews) — user confirmed this is correct/intentional since external platforms don't reliably expose per-review star data to us.
- Confirmed opt-out is genuine and fully wired: Settings → Notifications → Weekly/Monthly/Never, plus a working unsubscribe link in the email footer, both actually gate the cron in `index.ts`.

**CLAUDE.md maintenance this session:** file had grown to 27,110 chars — archived sessions 101–104 (mostly Google API diagnostic sessions with no code changes) to `CLAUDE_ARCHIVE.md` to stay under the 30k threshold.

**NEXT SESSION — FIRST STEPS:**
1. **Send fresh test emails from the admin panel** for every template touched this session — several of the user's earlier test sends predate these fixes and won't reflect them.
2. **Decide on the `insight` admin template** — wire `insightEmail.ts` up to use `DEFAULT_EMAIL_TEMPLATES.insight`/DB overrides (bigger job, table/chart-based not plain text), or remove the dead admin entry.
3. **Check whether `renewal_reminder` / `platform_review` admin template entries should be removed** — dormant since their auto-triggers were removed, still test-able/editable.
4. User said "once these are all perfect... i will be deleting that header" — unclear what "that header" means; ask directly rather than guessing.

**LESSON LEARNED:**
- Email wording edits: always check BOTH `email.ts` (actual send logic) AND `systemEmailTemplates.ts` (`DEFAULT_EMAIL_TEMPLATES`, what the admin panel shows/edits) — two separate copies of "default" text, go out of sync silently if only one is updated.
- Broad instructions ("every email should X") — apply narrowly to what's clearly in scope, confirm before sweeping. Over-applied `hello@reviewoptic.com` reply-to to all 16 emails when user meant only the 2 named (cancellation + expiry); had to revert 14.
