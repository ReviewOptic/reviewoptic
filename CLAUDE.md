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

---

## REMEMBER

The person you are working with is smart but not technical. They are building a real business. Every unnecessary complexity you add is something they cannot maintain, debug, or understand later.

Simple code that works beats clever code that impresses. Every time.

Your job is to be the developer they would hire if they could afford a great one. Decisive. Clear. Protective of simplicity. Shipping working software.

---

## SESSION LOGS

*(Sessions 18–25 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-03-25 (twenty-sixth session)

**Tasks completed:**
- SMS and WhatsApp review flow unified with email — all three channels now send a single text link; customer taps it → ReviewLanding → selects stars → confirms → next step (low rating = private feedback, high rating = platform links + optional recording)
- Old WhatsApp initial voice/video send (recording sent as a WhatsApp attachment before rating) removed entirely
- "After 4–5★ rating, show" picker (Text only / Voice note / Video) now appears in Send Request dialog for all channels (was email-only); `recordingId` passed to server for all channels so recording shows on ReviewLanding after high rating
- WhatsApp "Message type" selector (Text/Voice/Video for initial message) removed from both send dialogs
- `canSend` and Send button `disabled` conditions simplified — WhatsApp no longer requires a preview to be generated before sending
- Analytics — new "Content Type Performance" chart added: shows platform click rate broken down by content type (Text only, Voice note, Video); helps identify which after-rating content converts best
- Tutorials & Guides updated: "How to send a review request" rewritten to explain single-link flow and the After 4–5★ option; analytics how-to updated to mention Content Type Performance chart; top tips updated; voice/video how-to and video entry removed (covered inline in send request how-to)

**Architecture notes:**
- All three channels (email, SMS, WhatsApp) now follow identical flow: initial message with rating link → ReviewLanding → star rating → confirm → next step
- `recording_url` / `recording_type` on `review_requests` is set when `recordingId` is passed at send time; ReviewLanding reads it and shows the recording after a high rating — no changes needed to ReviewLanding
- `contentTypeData` query in analytics joins `review_requests` with `review_platform_clicks` on `request_id`; groups by `COALESCE(recording_type, 'text')`

**Notes for next session:**
- `POST /api/reviews` endpoint in routes.ts is still orphaned — safe to remove in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- Cloudinary now correctly configured (`CLOUDINARY_CLOUD_NAME` = `dliv5t1po`) — recordings should upload to Cloudinary properly
- Server restart required for analytics `contentTypeData` query to take effect

### Session — 2026-03-25 (twenty-seventh session)

**Tasks completed:**
- Orphaned `POST /api/reviews` comment in routes.ts cleaned up (endpoint was already removed, stale comment remained)
- Website review widget built out fully: widget API now queries `review_requests` (where `rating >= minStars`) instead of empty `reviews` table; widget.js rewritten to show rating cards (name, stars, date) in grid or carousel layout; Settings → Widget tab now has config controls for min stars (4+/5 only), count (3–10), layout (grid/carousel)
- Content Type Performance chart redesigned: now a vertical bar chart with one bar per content type (Text only, Voice Note, Video) showing click rate %; unknown DB values bucketed into Text; always shows all 3 types; grey bars for unused types
- "Voice Note" capitalisation fixed in Content Type Performance chart labels
- Platform review links fixed: ExternalLink test button in Settings now trims and adds `https://` before opening; server-side URL handling also trims whitespace on both platform URL build paths
- Dashboard stat cards updated from 3 to 5 cards: Requests Sent, Links Clicked, Click Rate, Unread Feedback, Avg. Star Rating
- Tutorials & Guides fully audited and updated: follow-up timing description corrected (all delays from original send date, not sequential); archive how-to updated to match actual UI ("Archived" button); new "How to set up your website widget" how-to + video entry added
- **Feature 1 — Send New Request**: button label changes to "Send New Request" on CustomerDetail and dropdown when customer status is `clicked` or `no_response`
- **Feature 2 — ReviewLanding click confirmation**: clicking a platform button now shows a green "Opening [Platform] for you — thank you!" confirmation banner in the dialog
- **Feature 3 — Bulk send**: checkboxes added to Customers table; select-all in header; floating action bar appears when customers are selected; bulk send dialog with channel picker (email/SMS/WhatsApp); sends sequentially, skips DNC customers
- **Feature 4 — Default send time**: new `default_send_time` column in settings DB; time picker in Settings → Follow-up tab; send dialogs auto-pre-select that time when opening (rolls to tomorrow if time already passed)
- **Feature 5 — Dashboard to-do nudge**: two smart nudge cards above main content — amber for no-response customers, blue for customers pending 14+ days; both link to Customers page; only show when relevant
- **Feature 7 — Star ratings visible**: customer list rows now show latest star rating as small gold stars under status badge; CustomerDetail "Reviews" card renamed "Ratings" and now shows pre-screen ratings from review_requests with date (old reviews table was empty)
- Tutorials updated to reflect all new features (bulk send step added to send how-to; default send time added to follow-up how-to; star rating note added to statuses how-to)

**Architecture notes:**
- `default_send_time` is a TEXT column (e.g. "10:00") stored in settings; send dialog computes a datetime-local string from it on open
- Bulk send loops through selected customers sequentially via existing `POST /api/review-requests`; no new server endpoint needed
- Widget.js now uses `/api/widget/:businessId/reviews` (queries review_requests) not `/api/public/widget-stats` (which only returns counts); layout returned from server settings
- Content type analytics: unknown `recording_type` values bucketed into `text` server-side; all 3 types always returned even if sent=0

**Notes for next session:**
- **Feature 8 (request history per customer)** — not yet built; CustomerDetail shows activity timeline but not a dedicated request history with all sends/follow-ups/ratings in a structured list
- **Feature 9 (email open tracking)** — deferred; needs tracking pixel endpoint (`GET /api/track/:id/open` returning 1×1 GIF), `opened_at` column on review_requests, and pixel embedded in outgoing emails
- `POST /api/reviews` endpoint in routes.ts still orphaned — safe to remove
- Instagram auto-posting still not built
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- Server restart required for `default_send_time` migration to run

### Session — 2026-03-25 (twenty-eighth session)

**Tasks completed:**
- **Feature 8 — Request History**: CustomerDetail "Review Requests" card redesigned into "Request History" — each request shown as a journey with chips: Sent → Opened (email) → Follow-up 1/2/3 → outcome (Clicked / Rated-no-click / Private feedback / No response). Star rating shown in header. Sorted newest first.
- **Feature 9 — Email open tracking**: 1×1 GIF pixel embedded in pre-screen emails. Public `GET /api/track/:id/open` endpoint sets `opened_at` on first open. `opened_at` column added to `review_requests` via schema + migration.
- **Automated platform review requests**: When a ReviewOptic user (business) has been signed up 30 days, they automatically receive an email from ReviewOptic asking them to leave a review. Follow-up 1 at +3 days, Follow-up 2 at +7 days. Tracked via `auto_review_requested_at` and `auto_review_follow_ups` on `users` table. Controlled by env vars: `PLATFORM_REVIEW_GOOGLE_URL`, `PLATFORM_REVIEW_TRUSTPILOT_URL`, `PLATFORM_REVIEW_VIDEO_URL`. Admin users excluded.
- **Follow-up wording fix**: Settings → Follow-up tab now shows gap-based descriptions ("Send the second follow-up 4 days after the first follow-up") instead of confusing cumulative day numbers. Day badge also shows the gap.
- **TimePicker component**: Replaced all native `<input type="time">` with a shared `TimePicker` component — hour dropdown (1–12), :00/:30 toggle, AM/PM toggle. Used in Settings default send time and Customers send dialog custom time.
- **Admin customer data cleared**: All customers, review requests, private feedback, and activity logs deleted from admin account (`hello@reviewoptic.com`) for a clean start.
- **Dashboard quotes expanded**: 8 → 20 quotes, now randomised on each page load (not daily) so multiple logins per day show different quotes.
- **Dashboard improvements**: Added quick links row (Customers/Templates/Analytics/Settings icon tiles, placed below stats), "Ready to Send" sidebar card (pending customers with direct Send button), "Latest Ratings" sidebar card (last 4 star ratings). Removed old Quick Actions card.
- **Settings → Referral tab**: Unique referral link per user using business name slug (e.g. `reviewoptic.com/referral/bobs-plumbing`). Copy button, WhatsApp/Facebook/X/LinkedIn/Email/SMS share buttons. "Offer coming soon" placeholder.

**Architecture notes:**
- `opened_at TIMESTAMP` on `review_requests` — nullable, set once on first pixel load
- `auto_review_requested_at TIMESTAMP` + `auto_review_follow_ups INTEGER` on `users` — daily runner in index.ts
- `TimePicker` shared component at `client/src/components/ui/time-picker.tsx`
- Referral slug = `businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")` — no DB column, derived at render time
- Referral link route (`/referral/:slug`) does NOT exist yet — it's a placeholder display only

**Notes for next session:**
- **Referral programme activation**: needs (1) server route `GET /referral/:slug` → redirect to `/signup?ref={accountId}`, (2) store `referred_by_account_id` on new accounts at registration, (3) admin view of referral counts, (4) update offer text in Referral tab
- **Server restart required**: for `opened_at` and `auto_review_*` migrations to run
- `POST /api/reviews` endpoint still orphaned in routes.ts — safe to remove
- Instagram auto-posting still not built
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
