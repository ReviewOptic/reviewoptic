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

*(Sessions 18–100 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-06-14 (one-hundred-and-first session)

**Context:** Session carried over from session 100. Large portion of work done in context that was compacted. Fixed multiple bugs from session 100 scope.

**What was built this session:**

1. **Demo account improvements (`server/routes.ts`):**
   - Reseed interval changed from 7 days → 3 days (automatic, no manual button)
   - Added `follow_up_count` logic to demo customers (1 follow-up if >10 days, 2 if >30 days)
   - Added `social: true/false` flag to demo EXTERNAL_REVIEWS
   - Added TripAdvisor and MyBuilder entries to demo reviews

2. **Total Reviews stat — real platform totals (`server/externalReviews.ts`, `server/routes.ts`, `server/migrate.ts`):**
   - Each platform fetcher now returns `platformTotal?: number`
   - Google: separate API call for `user_ratings_total` (isolated so field errors don't block reviews)
   - Trustpilot/TripAdvisor/MyBuilder: JSON-LD `aggregateRating.reviewCount` extraction
   - Checkatrade: deep object scan via `findCountFieldInObject()`, 50-page limit
   - Totals stored as JSON in `ext.settings_extra.platform_review_totals` after each poll
   - `GET /api/external-reviews` returns `{ reviews: [...], total: N }` where N = sum of stored platform totals
   - Dashboard stat card and subtitle now use this real total

3. **Dashboard empty state fix (`client/src/pages/Dashboard.tsx`):**
   - Distinguishes "no links configured" vs "links added but no reviews yet"
   - "Links added — checking your platforms for reviews. This can take a minute." shown when links exist but reviews haven't imported yet

4. **Poll frequency increased (`server/index.ts`):** 6 hours → 1 hour

5. **Trustpilot scraper unblocked (`server/externalReviews.ts`):**
   - Old UA string `"Mozilla/5.0 (compatible; ReviewOptic/1.0; +https://reviewoptic.com)"` was identified by Cloudflare as a bot
   - Changed to full real Chrome 125 UA with browser headers (Accept, Accept-Language, Sec-Fetch-*, etc.)

6. **Settings autosave — multiple bug fixes (`client/src/pages/Settings.tsx`):**
   - Added `hasInitializedRef` to block autosave before first settings load
   - Added `refetchOnWindowFocus: false` to prevent mid-edit refetch wiping form changes
   - **Root fix (this session):** autosave was using `setQueryData` with the raw PATCH response — this response does NOT include `googleMapsLink` (stored in `ext.settings_extra`, not main settings table). This caused form to reset without `googleMapsLink`, making Google look disconnected after autosave. Fixed: replaced `setQueryData` with `invalidateQueries` so the GET is called fresh and `getSettings()` merges ext fields back correctly.
   - Removed diagnostic `[settings PATCH]` console.log (served its purpose)

**CRITICAL RULE added:**
- After autosave, NEVER use `setQueryData` with the PATCH response — it doesn't include ext-stored fields. Always use `invalidateQueries` to trigger a fresh GET that goes through `getSettings()` which merges `ext.settings_extra`.

**NEXT SESSION — FIRST STEPS:**
1. **Deploy and test:** Settings → Social → paste Google Maps link or search → confirm → "Connected" view should persist after 1.5s autosave
2. **Check Google poll:** Replit logs — should no longer see INVALID_REQUEST errors (the `user_ratings_total` separate-call fix prevents field errors from blocking reviews)
3. **Verify total reviews stat** — add a review platform link, wait for poll → stat card should show platform's real total, not just imported count

**Pending:**
- **Google Business Profile OAuth** (case 6-8166000040742, ~7-10 days from 2026-06-13) — gives ALL reviews for service area businesses; once approved, test OAuth flow
- **Google OAuth scope verification** — submit via Google Cloud Console once OAuth confirmed working for all users
- **Facebook App Review** — waiting (~2 weeks from June 10)
- **SEO — "ReviewOptic" branding** consistency (meta tags, GBP listing, backlinks)
- **Landing page videos**, **tracking pixel IDs**, **first blog post** — all still pending

### Session — 2026-06-23 (one-hundred-and-second session)

**Context:** Diagnostic session — no code changes. Investigated Google Business Profile OAuth connection failure.

**What was diagnosed:**
- All GBP-related APIs are enabled and approved (confirmed via Google Cloud Console → Support → Cases — all have ticks)
- OAuth flow works correctly up to the accounts API call
- `mybusinessaccountmanagement.googleapis.com/v1/accounts` returns **429 RESOURCE_EXHAUSTED** — default quota is **0 requests**
- This is a separate issue from API enablement — quota must be explicitly increased
- Submitted quota increase request: **case 1-7070000041921** (submitted 2026-06-23)

**SEO audit:**
- All meta tags already use "ReviewOptic" (one word) consistently — no code fixes needed
- "review optic" in Google search results is a Google algorithm issue, not a code issue — improves over time with consistent branding in backlinks and GBP listing

**NEXT SESSION — FIRST STEPS:**
1. **Check Google quota case** — go to console.cloud.google.com → Support → Cases → find case **1-7070000041921**
2. **If approved** — go to APIs & Services → My Business Account Management API → Quotas & System Limits → edit "Requests per minute" → set to 600
3. **Then test** — Settings → Social → "Connect Google Business Profile" → should work in one click
4. **Facebook App Review** — check if approved (submitted ~June 10)

**Pending:**
- **Google GBP quota increase** — case 1-7070000041921, submitted 2026-06-23
- **Google OAuth scope verification** — submit once OAuth confirmed working for all users
- **Facebook App Review** — waiting (submitted ~June 10)
- **Landing page videos**, **tracking pixel IDs**, **first blog post** — all still pending

### Session — 2026-06-24 (one-hundred-and-third session)

**Context:** No code changes. Diagnostic session chasing Google Business Profile API access.

**What was diagnosed:**
- Quota increase request (case 1-7070000041921) was **denied** — Google says the Cloud project is not yet approved for Business Profile API access
- Denial email had no case number and no reply-to address — dead end
- Cloud Console → Support → Cases shows no cases (free tier account — no support plan)
- Google review scraping is NOT a viable option (confirmed from prior sessions — Google blocks it)
- Places API only returns 5–7 reviews — not useful

**Key clarification:**
- The official route for Business Profile API access is through: **developers.google.com/my-business/content/prereqs**
- Case 6-8166000040742 (submitted June 13) should have gone through this form — status unknown
- Next step is to visit that URL and either check the existing application status or resubmit if it wasn't filed correctly

**NEXT SESSION — FIRST STEP (do this first):**
1. Go to **developers.google.com/my-business/content/prereqs** and check/resubmit the Business Profile API access application
2. Check **Facebook App Review** status (submitted ~June 10, now ~2 weeks later)
3. If Google is still blocked, move to other pending work (landing page videos, tracking pixel IDs, first blog post)

### Session — 2026-06-24 (one-hundred-and-fourth session)

**Context:** No code changes. Session spent chasing Google Business Profile API access status and planning next steps.

**What happened:**
- Investigated case 21707041921 visible in Google Cloud Console when creating a new support case — confirmed it's a past case reference, not an active tracked case, and details are inaccessible on free tier
- Previous case 6-8166000040742 (June 13) had no confirmation email — submission may not have completed properly
- **Resubmitted GBP API access** via "Application for Basic Access" form — case **1-6925000040797**, submitted 2026-06-24, expected response ~2026-07-07
- No confirmation email received (Google's developer support system doesn't reliably send them — the on-screen confirmation is the proof)
- Facebook App Review — still in progress
- Tracking pixels — not yet set up (no Facebook ads account yet)
- Blog posts — deferred; user not ready for public traffic yet
- **Beta testing** — identified as the right next step before onboarding real customers

**NEXT SESSION — FIRST STEPS:**
1. **Check Google case 1-6925000040797** — expected response around 2026-07-07
2. **Check Facebook App Review** status
3. **Plan beta testing** — identify 2-3 small business owners to test the app for real

**Pending:**
- **Google Business Profile API access** — case **1-6925000040797**, submitted 2026-06-24, expected ~2026-07-07
- **Google OAuth scope verification** — submit once OAuth confirmed working for all users
- **Facebook App Review** — ✅ APPROVED (2026-06-30). App is Live, all permissions approved.
- **Beta testing** — next logical step before opening to paying customers
- **Landing page videos**, **tracking pixel IDs**, **first blog post** — deferred until ready for public traffic

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
