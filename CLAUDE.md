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

*(Sessions 18–113 archived to CLAUDE_ARCHIVE.md. Still-pending items from those sessions are carried forward in session 114/115's "NEXT SESSION" lists below.)*

### Session — 2026-07-15 (one-hundred-and-fourteenth session)

**Context:** Very short session — user confirmed the stray-hyperlinks issue (carried for 5 sessions) has resolved itself and asked to fix the `follow_up1_days` demo-reseed error from session 113's notes.

**Fixed — and it turned out to be a bigger, live bug than the session-113 notes suggested.** Root cause: `server/storage.ts` has two hand-rolled camelCase↔snake_case converters for the `settings` table (`toSnake` in `upsertSettings`, `toCamel` in `settingsRowToCamel`) because it talks to Postgres via raw SQL instead of the Drizzle query builder for this table. Neither converter handled a digit sitting between letters correctly:
- `toSnake` turned `followUp1Days` into `follow_up1_days` (missing the underscore before "1") instead of the real column `follow_up_1_days` — this is what broke the demo reseed, since creating a *brand-new* settings row has no error-recovery (unlike updating an *existing* row, which already had a self-healing retry loop that drops any column Postgres complains about).
- **Found while verifying the fix — a second, matching bug in the reverse direction, and this one was live in production, not just demo-only:** `toCamel` turned the real column `follow_up_1_days` back into `followUp_1Days` (stray underscore, no digit merge) instead of `followUp1Days`. Since this same function backs `getSettings()` — the read path used everywhere in the app, for every real account — `settings.followUp1Days`/`followUp2Days`/`followUp3Days` were **always `undefined`** whenever read back from the database. This was silently masked because the one place that consumes these values (`storage.ts:524`, the follow-up scheduling logic) does `s.followUp1Days ?? 3` — so any customer who'd customised their follow-up delay timing in Settings was having that customisation silently ignored and replaced with the hardcoded default (3/7/14 days) on every single use, with no error or warning anywhere.
- **Fix:** broadened both regexes to also treat digits as a case-boundary — `toSnake` now inserts an underscore between a lowercase letter and a following digit; `toCamel` now treats an underscore followed by a digit the same as an underscore followed by a letter. Confirmed via `information_schema`/direct code check that `follow_up_1_days`/`_2_`/`_3_` are the *only* three columns in this table with a digit in the name, so this was safe to broaden without risking any other field.
- **Verified live against the real (sandboxed) database**, not just code review: inserted a brand-new settings row with custom follow-up values (5/9/20 days instead of the 3/7/14 defaults), confirmed the insert no longer throws, then re-read it back via the actual `getSettings()` path and confirmed the custom values round-tripped correctly instead of coming back `undefined`. Cleaned up the test row afterward. `tsc --noEmit` clean, no new errors.

**Item 2 (stray hyperlinks in `cancellation`/`account_deletion`) — closed, no code change.** User confirmed they can no longer see the issue in the admin panel; likely resolved by an edit they made themselves between sessions. Dropped from the carryover list.

**NEXT SESSION — FIRST STEPS:**
1. **Do a real end-to-end verification of session 113's biggest changes** — log in as a team member (not just the admin/owner account) and confirm: their dashboard only shows their own stats, the per-member breakdown is invisible to them, and private feedback is correctly scoped. Also worth a real Stripe test-mode webhook run (or at least `stripe trigger invoice.payment_succeeded`) to confirm the relocated referral-credit logic actually fires.
2. Worth a heads-up to the user (not yet given): any customer who previously set custom follow-up delay days may notice their timing "changes" now that the real saved value is being read instead of the silently-defaulted 3/7/14 — this is the *correct* value finally being used, not a regression, but it could look like unexpected behavior if a customer set custom values long ago and forgot.
3. If reactivation-without-trial timing (session 113 Part 4's flagged issue) is ever reported as "confirmation email came a month late," that's the known cause — the `billing_reason: subscription_create` guard in the `invoice.paid` webhook.
4. `bucksandherts` and the "which header will you delete" question — still unconfirmed, ask directly if they resurface.
5. Orphaned `ext.external_reviews`/`ext.settings_extra` DB columns — still just harmless dead weight, no urgency.

**LESSON LEARNED:** a bug fix that only touches half of a read/write round-trip (fixed the write side, `toSnake`) can leave the other half (`toCamel`) silently broken in a way that looks like success — the insert stopped throwing, but the data came back wrong. Always verify a serialization fix by writing *and reading back*, not just confirming the write no longer errors. This is also the second time this project has had a "handles the demo-only symptom, but the real bug affects every real account" surprise (the first was the admin-metrics/insight-email demo-exclusion bug, session 110) — worth treating any "only breaks for the demo account" report as a prompt to check whether real accounts share the same code path silently.

### Session — 2026-07-15 (one-hundred-and-fifteenth session)

**Context:** Closed out two long-carried items, then two fresh bug reports came in mid-cleanup, then a broad "make it fast, optimise for mobile" request. Files touched: `server/index.ts`, `server/insightEmail.ts`, `server/migrate.ts`, `server/routes.ts`, `server/storage.ts`, `client/public/favicon.png`, `client/public/reviewoptic icon only - square - app.png`, `package.json`.

**Part 1 — Closed two long-standing carryover items:**
1. The "which header will you delete" question (session 107, never resolved) — user said to just ignore it, no longer relevant.
2. Dropped the orphaned `ext.external_reviews` and `ext.settings_extra` tables for real — confirmed zero remaining code references first, then actually ran `DROP TABLE`/`DROP SCHEMA` against the live database (not just removed the code), and deleted the now-pointless `ensureExternalReviewsTable()` function plus its call site in `index.ts`.

**Part 2 — Insight-report email was firing instantly on signup instead of Friday/month-end evening.** Root cause was two compounding bugs in `insightEmail.ts`/`index.ts`: (a) the job ran unconditionally on every server boot/redeploy — despite a comment on an *adjacent* job in the same file explicitly warning not to do this — so any brand-new signup with no prior insight email would get caught the moment the server next restarted; (b) even ignoring that, the "due" check only looked at *elapsed time* since the last send (7/30 days), with zero awareness of actual day-of-week or month-end. **Fixed:** removed the boot-time trigger entirely, switched to an hourly check (matching the existing `runScheduledChecks` pattern), and the job now only sends during the exact Friday-18:00 (weekly) or last-day-of-month-18:00 (monthly) window — verified the day/hour detection against several test dates including the edge case where the last Friday of a month is also the last day of that month.

**Part 3 — Two new bug reports, both investigated and fixed/flagged:**
- **New signups not appearing as a customer on the admin's own account.** Traced the exact code path (`/api/auth/register`'s auto-add-as-customer block, gated entirely on `process.env.ADMIN_EMAIL` resolving to a real user) and tested it directly against the sandbox database — it worked perfectly there. Since this sandbox's database only ever contains the admin's own test account (isolated from production, confirmed via a direct query showing no other recent signups), **couldn't reproduce the actual failure** — most likely cause is `ADMIN_EMAIL` being unset, misspelled, or mismatched in the **production** deployment's environment secrets, which this sandbox can't inspect. Made the failure loud instead of silent either way: now logs a clear `[register] ADMIN_EMAIL...` error server-side if this ever happens again, and wrapped the customer-creation call in its own `.catch()` so a DB error there can no longer silently abort the rest of registration. **Asked the user to verify the production `ADMIN_EMAIL` secret is exactly `hello@reviewoptic.com`** — unconfirmed as of session end.
- **Admin panel's insight-email "Total Sent"/"Total Opened" counters included the admin's own "Send Test" clicks.** Confirmed and fixed: `/api/admin/insight-stats` excluded the demo/Meta-reviewer accounts via `NON_CUSTOMER_EMAILS` but never excluded admin accounts themselves — every test-send to `hello@reviewoptic.com` was counting as a real customer send. Fixed by joining to `users` and excluding `is_admin`, matching the exact exclusion pattern already used by the main `/api/admin/metrics` endpoint. Verified live: simulated a test-send log row, confirmed it's now excluded from the count.

**Part 4 — "Clean up anything slowing the app down, optimise for mobile" (broad ask, scoped via an Explore-agent research pass first, then fixed the highest-impact items):**
- **Biggest single finding of the session: every core table (`customers`, `review_requests`, `reviews`, `activity_log`, `private_feedback`, `templates`, `users`) had only a primary-key index, despite nearly every query in the entire app filtering by `account_id`.** Every one of those queries has been doing a full table scan since the app was built. Added 14 indexes covering `account_id` on every relevant table plus the other heavily-filtered/joined columns (`stripe_subscription_id`, `customer_id`, `sent_by_user_id`, `review_request_id`, `insight_email_log.user_id`/`account_id`). Purely additive (`CREATE INDEX IF NOT EXISTS`), no behavior change — verified live by actually running the migration against the sandbox DB and confirming all 14 indexes exist, plus confirmed the migration is safely idempotent on a second run. Invisible today with a small dataset, but this was the single biggest thing that would have gotten worse as the customer base grows.
- Fixed a real N+1 in the automated follow-up job (`storage.ts` `sendFollowUps`) — was calling `getTemplates(accountId)` once per *customer* instead of once per *account*, refetching identical rows repeatedly for accounts with many customers due for a follow-up.
- Removed the unused `@octokit/rest` dependency (zero references anywhere in the codebase; confirmed before removing).
- Compressed the two genuinely-used-on-every-page-load image assets with `sharp` (already an installed dependency) — app icon 105KB→52KB, favicon 50KB→24KB — checked visually side-by-side against the originals first to confirm no quality loss (both have blue/gold gradients that could band under aggressive palette compression; they didn't). `logo.png` (used on nearly every page) was already well-optimized, left alone. Left one orphaned, completely unreferenced logo file alone deliberately — zero runtime impact since nothing loads it, didn't want to delete a brand asset without checking first.
- **Investigated and deliberately did NOT touch:** route-level code splitting (already fully implemented — every page component is `React.lazy()`-loaded) and the heavy chart/PDF-export libraries (`recharts` ~557KB, `jspdf`+`html2canvas` ~586KB combined) — the export libraries are already dynamically imported only when a user actually clicks export, and `recharts` is only pulled in when visiting Analytics/Admin, both of which show charts as primary content on load, so further splitting would add complexity for close to zero real benefit.

**Verification throughout:** every fix this session was checked against the real sandbox database or a live migration run, not just code review — `tsc --noEmit` stayed at the same 8 pre-existing, unrelated baseline errors the whole session (confirmed via diff against the pre-session baseline), and a full `vite build` succeeded with unchanged bundle output at the end.

**Part 5 — Follow-up conversation, same session: closed out the `ADMIN_EMAIL` question and found + fixed the real remaining gap.**
- User confirmed the production `ADMIN_EMAIL` secret is correctly set to `hello@reviewoptic.com` — rules out the config-mismatch theory from Part 3. Also checked two other angles (Customers page default sort order, pagination) and ruled those out too — the page already sorts newest-first by default. The specific instance the user hit is unreproducible and most likely was transient; the user later confirmed the customer *did* show up correctly. Logging added in Part 3 stays in place as a safety net if it recurs.
- **Real, permanent gap found and fixed while investigating:** the new-signup-auto-added-as-customer flow (`/api/auth/register`) never called `storage.createActivity(...)`, so new signups never appeared in the Dashboard's "Recent Activity" feed — even though that feed already fully supports a `customer_added` activity type (icons, colors, display all already built, used correctly by every *other* way a customer gets added). Fixed by adding the same `createActivity` call the manual add-customer endpoint already uses. Audited all other activity types the user asked about (request sent, ratings received, private feedback, link clicked) and confirmed they're all already logged correctly elsewhere — this was the one specific gap, not a systemic issue. Verified end-to-end against the sandbox DB: created a customer, logged the activity, confirmed it's retrievable via the same `getActivityLog` call the Dashboard actually uses.
- `bucksandherts` — user said to just ignore it, dropped from tracking entirely.

**NEXT SESSION — FIRST STEPS:**
1. Still pending from session 113: a real end-to-end login-as-team-member test of the stats/feedback scoping work, and a real Stripe test-webhook run to confirm the referral-credit relocation actually fires correctly.
2. If a customer's follow-up delay timing looks like it "changed" unexpectedly, that's the session-114 `toCamel` fix working correctly (their real saved value is finally being used) — not a new bug, mentioned here again since it hasn't come up yet.
3. Watch for whether the new-signup-not-showing-as-customer issue recurs now that it fails loudly — if it does, check server logs for the `[register]` lines added in Part 3 before assuming it's the same cause as last time.
