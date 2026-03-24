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

*(Older logs archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-03-22 (eighteenth session)

**Tasks completed:**
- Analytics overhauled to reflect what can actually be tracked — reviews are not submitted on the platform (customers are redirected to Google/Trustpilot etc.), so all "reviews received" metrics replaced with "links clicked"; removed Time to Review and Review Platforms charts (both relied on internal reviews table); renamed `responseRate` → `clickRate`, `reviews` → `clicks` throughout server and frontend
- Removed `sendNewReviewNotification` from email.ts — can't detect when a review is left on an external platform
- ReviewLanding page simplified — now just shows platform buttons (Email/click-through only); no internal review submission form
- Billing page — cancel/reactivate section removed
- Dashboard redesigned — new stat cards layout with greeting, cleaner layout
- Add Customer form — "Preferred Channel" field removed; channel is now selected at point of sending only
- Add/Edit Customer — email and phone format validation added; red border + error message shown inline when format is invalid; submit blocked until valid
- Send Request dialog — channel options now disabled based on available contact info (Email disabled if no email saved, SMS/WhatsApp disabled if no phone saved); auto-selects a valid channel on open
- Send Request dialog — Custom time option now shows a datetime-local picker; 1h/2h options correctly calculate future timestamps; send blocked until custom time is picked
- Send Request dialog — Template dropdown shows all templates for the selected channel; dropdown only appears when >1 templates exist; if 0 templates, shows a link to create one; always passes correct template ID to server
- How-to guides updated to reflect all the above changes; "Review Received" status replaced with "No Response"; analytics how-to updated to say "click rate"

**Architecture notes:**
- `review_completed` status is effectively dead — the old review submission form has been removed from ReviewLanding; only `clicked`, `request_sent`, `no_response`, `pending_request` statuses are active
- `POST /api/reviews` endpoint still exists in routes.ts but is no longer called by the frontend — safe to remove in a future cleanup session
- Analytics `daily` data now tracks `clicks` (customers with `status = 'clicked'`) not review submissions

**Notes for next session:**
- `POST /api/reviews` endpoint in routes.ts is orphaned — the ReviewLanding no longer submits reviews; can be removed in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-22 (nineteenth session)

**Tasks completed:**
- Dashboard "Requests This Month" stat now counts total rows from `review_requests` table (not unique customers) — correctly counts re-sends to the same customer for multiple jobs
- Dashboard "Awaiting Response" stat now counts `review_requests` with `status = 'pending'` (not customers with `status = 'request_sent'`) — keeps both stats consistent and comparable
- Analytics — full rewrite of core data source: all key metrics (sent, clicked, daily chart, channel breakdown) now query from `review_requests` table directly instead of the `customers` table; previously, filtering by `customer.createdAt` meant re-sends and multi-job customers were invisible or miscounted
- Analytics — daily chart now groups by `DATE(created_at)` and `DATE(clicked_at)` from review_requests, not customer creation date
- Analytics — channel breakdown and daily-by-channel charts now use review_requests grouped by channel
- Analytics — Follow-up Effectiveness chart fixed: now detects actual follow-ups by joining to `templates` table and checking `template_type = 'follow_up'`, instead of counting total requests per customer (which wrongly flagged re-sends for different jobs as follow-ups)
- Analytics — Best Day to Send chart: now based on `clicked_at` day-of-week (when customers actually click), not when requests were sent; only shows when there is actual click data

**Architecture notes:**
- Analytics endpoint no longer loads `allCustomers` for core stats — everything flows from `review_requests` SQL queries
- `baseParams` / `baseWhere` pattern used in analytics to cleanly handle channel and userId filter additions
- `review_requests.clicked_at` column stores when the link was clicked — used for Best Day to Send
- `review_requests.status` values: `pending` (sent, not yet clicked), `clicked`

**Notes for next session:**
- Server restart required for all server-side changes to take effect (HMR only applies to Vite/client code)
- `POST /api/reviews` endpoint in routes.ts is still orphaned — safe to remove in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-23 (twentieth session)

**Tasks completed:**
- Recordings system overhauled — replaced single voice/video URL per account (stored in settings) with a `recordings` DB table supporting up to 2 recordings per type per account
- New DB migration: creates `recordings` table; migrates any existing `voice_note_url` / `video_message_url` from `settings` automatically on startup
- New API endpoints: `GET /api/recordings`, `POST /api/recordings/upload`, `PATCH /api/recordings/:id` (rename label), `DELETE /api/recordings/:id`
- Preview endpoint updated: now takes `recordingId` instead of `messageType`
- Templates → Recordings tab rewritten: in-app browser recording (no file picker); voice uses microphone, video uses camera; record → review → label → Save; up to 2 recordings per type; rename and delete each recording
- Send Request dialogs (Customers + CustomerDetail): load recordings list from API; auto-select first recording; show dropdown when 2 exist for the type; pass `recordingId` to preview; fixed broken link from "Settings → Recordings" to "Templates → Recordings"
- Added `uploads/` to `.gitignore` (was missing — runtime files were showing as untracked)

**Fixes applied:**
- Video recorder "Start recording" did nothing — video `<video>` element was conditionally rendered, so `videoPreviewRef.current` was null when stream was assigned; fixed by always rendering the element (hidden via CSS when idle)
- Voice/video save failed — `CLOUDINARY_CLOUD_NAME` secret is set to `"ReviewOptic"` (business name) instead of the actual Cloudinary account ID, causing 401 errors; fixed by falling back to local disk storage when Cloudinary upload fails (same approach as template audio/video uploads)
- `recordingUpload` multer instance was declared inside `registerRoutes` with a relative `dest` path; moved to module level with absolute `uploadsDir` path and proper `.webm` filename extension

**Issues discovered:**
- **Cloudinary misconfigured** — `CLOUDINARY_CLOUD_NAME` is set to `"ReviewOptic"` not the actual cloud identifier; recordings currently save to local disk and will be lost on server restart. To fix: update `CLOUDINARY_CLOUD_NAME` secret to the real value from cloudinary.com → Dashboard

**Architecture notes:**
- `recordings` table columns: `id, account_id, type, label, url, elevenlabs_voice_id, created_at`
- Upload fallback order: try Cloudinary → if fails or not configured, save to `/uploads/uuid.webm`
- ElevenLabs voice clone only runs for `type = 'voice'` when `ELEVENLABS_API_KEY` is set; URL must be publicly accessible for it to work (local URLs won't work with ElevenLabs)
- Old `VideoRecorder` and `AudioRecorder` components at top of Templates.tsx still exist (used in template editing) — untouched

**Notes for next session:**
- `POST /api/reviews` endpoint in routes.ts is still orphaned — safe to remove in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-24 (twenty-first session)

**Tasks completed:**
- Star ratings now appear in Recent Activity — added `createActivity` call to `/api/public/review/:id/rate` endpoint; shows e.g. "John Smith left a 4-star rating ★★★★☆" with the gold star icon
- Dashboard Private Feedback — removed the duplicate plain-list card; only the amber "Needs Response" card with the response box remains

**Fixes applied:**
- `.gitignore` was malformed — `.env` and `uploads/` were merged onto one line (`.envuploads/`) so uploads were not being ignored; fixed by splitting onto separate lines

**Notes for next session:**
- Server restart required for star rating activity logging to take effect (server-side change in routes.ts)
- `POST /api/reviews` endpoint in routes.ts is still orphaned — safe to remove in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-24 (twenty-second session)

**Tasks completed:**
- Analytics color theme system — fixed black elements caused by `positive`, `negative`, `rating` color keys being missing from localStorage (stored before those keys were added); fixed by merging stored colors with Classic theme defaults on load
- Analytics sentiment/rating colors — changed "Negative" color from orange to red (`#ef4444`) across Classic, Ocean, and Fire themes; red is clearer and more intuitive for negative ratings
- Tutorials & Guides updated to reflect recent changes:
  - "How to record a voice note or video message" how-to rewritten — now reflects in-browser recording (record via mic/camera, stop, preview, label, save) instead of old file upload flow; includes 2-recording-per-type limit
  - New how-to added: "How to archive and restore a customer"
  - Videos list updated: recordings video description changed from "upload" to "record directly in the app"
  - New video entry added: "How to archive and restore a customer"

**Notes for next session:**
- Server restart required for star rating activity logging to take effect (server-side change in routes.ts)
- `POST /api/reviews` endpoint in routes.ts is still orphaned — safe to remove in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-24 (twenty-third session)

**Tasks completed:**
- `sendFollowUps()` in `server/storage.ts` fully rewritten — was only processing `request_sent` customers; now handles all follow-up statuses (`request_sent`, `follow_up_1_sent`, `follow_up_2_sent`, `follow_up_3_sent`)
- 3rd follow-up added using `followUp3Days` setting (previously only 2 follow-ups existed in the system)
- Customer status now correctly updated after each follow-up send: `follow_up_1_sent` → `follow_up_2_sent` → `follow_up_3_sent`
- `no_response` status now set automatically when a customer exhausts all follow-ups (`sentCount > maxFollowUps`)
- Smart template routing for follow-ups: customers who rated 4–5★ but haven't clicked a platform link → `response_positive` template (thanks for rating, please review publicly); unrated customers → `follow_up` template
- WhatsApp follow-ups now supported (was missing entirely); full merge-tag substitution applied to template body
- `sendWhatsAppMessage` imported into `server/storage.ts`
- Follow-up status badges added to `Customers.tsx`: `follow_up_1_sent` (sky blue), `follow_up_2_sent` (indigo), `follow_up_3_sent` (violet)
- Analytics follow-up effectiveness query fixed: was joining on `template_id` (always NULL for auto follow-ups) — now uses `follow_up_count > 0` which actually works
- Analytics follow-up effectiveness now shows 4 separate buckets: No follow-up / 1 follow-up / 2 follow-ups / 3 follow-ups (was "2+" before)
- New **Customer Pipeline** chart added to Analytics: horizontal bar chart showing customer counts per status (Request Sent → Follow-up 1/2/3 Sent → Clicked → No Response), colour-coded per stage
- New **No Response** summary card added to Analytics (derived from pipeline data)
- Analytics header restructured: title + action buttons (CSV/PDF/Colours/Layout) on top row; period pills + date pickers + team filter on a clean second row with `overflow-x-auto` (no more wrapping)
- Tutorials & Guides fully updated:
  - "How to set up follow-ups" — now covers all 3 follow-up tiers, smart routing (rated vs unrated), no_response auto-marking, and new status badges
  - "Understanding customer statuses" — now lists all 7 statuses including the 3 follow-up states
  - "How to read your analytics" — rewritten to cover pipeline chart, follow-up tiers, no response card, platform clicks, layout customisation
  - Top tip "The follow-up is where the magic happens" — updated to mention 3 tiers and the personalised rating reminder
  - Top tip "Check in with your analytics weekly" — updated to name the Customer Pipeline and Follow-up Effectiveness charts specifically

**Architecture notes:**
- `sendFollowUps()` uses `firstSentAt` (original request date) for all cutoffs — `followUp1Days`, `followUp2Days`, `followUp3Days` are all measured from the original send date, not from the previous follow-up
- `sentCount` = number of review_request rows with `sentAt IS NOT NULL` for a customer; maps to: 1=initial sent, 2=1 follow-up sent, 3=2 follow-ups sent, 4=3 follow-ups sent
- `no_response` is set when `sentCount > maxFollowUps` (already sent all follow-ups but customer still hasn't clicked)
- `response_positive` template type is used for rated-but-not-clicked follow-ups — same template type sent immediately after 4–5★ rating; using it again as a reminder is intentional
- Pipeline chart only shows statuses with `count > 0` for the selected period

**Notes for next session:**
- `POST /api/reviews` endpoint in routes.ts is still orphaned — safe to remove in a cleanup pass
- Instagram auto-posting and review widget still not built — decide whether to build or remove from features list
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
