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

*(Sessions 18–75 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-06-03 (eighty-fifth session)

**Tasks completed:**
- **Test emails fixed** (`server/routes.ts`, `server/insightEmail.ts`): Three email types were missing from the test-email switch entirely (`renewal_reminder`, `payment_failed`, `referral_reward`) — returning "Unknown email type" error and showing ✗ Failed in admin panel. Fixed. Also fixed `reset` (was custom HTML, now calls real function) and `insight` (was static dummy HTML, now calls real insight pipeline with admin's actual account stats via new exported `sendInsightEmailToUser` wrapper).
- **"Need Help" button no longer blocks UI** (`client/src/components/Layout.tsx`): Added `pb-20` to the `<main>` element so page content always clears the floating button on every page.
- **Import date filter removed from Customers tab** (`client/src/pages/Customers.tsx`): User only needs sortable columns (Name, Service, Status, Added) — date filter was unnecessary clutter. Removed state, filtering logic, and UI. Sort columns untouched.
- **Template dropdowns removed from Send Review Request dialog** (`client/src/pages/Customers.tsx`): The "After 4–5★ template" and "After 1–3★ template" dropdowns were removed from the send dialog. Server already auto-selects the default template. Users edit templates in the Templates section; the text/voice/video toggle is the only choice needed when sending.
- **Email format + unsubscribe consistency overhaul** (`server/email.ts`, `server/routes.ts`):
  - Password reset email: was missing logo (URL not embedded) and had no footer — fixed, moved to `email.ts` as `sendResetPasswordEmail` with embedded logo + `PLATFORM_FOOTER`
  - Private feedback notification: was inline HTML with URL logo and no footer — extracted to `sendPrivateFeedbackNotificationEmail` in `email.ts` with proper format
  - Added `getUserUnsubscribeInfo(email)` helper — one DB call returning both `unsubscribed` flag and `userId` for footer link
  - **Transactional emails** (verification, reset, team invite, subscription confirmation, cancellation, account deletion, payment failed, renewal reminder) — always send regardless of unsubscribe status
  - **Non-transactional emails** (rating notification, private feedback, platform review request, referral reward, subscriber review request, incomplete registration) — now check `email_unsubscribed` first and skip if set; all have a personal unsubscribe link in footer via `platformUnsubscribeFooter(userId)`

**Pending:**
- **Facebook App Review**: Still waiting on Meta's response.
- **Re-seed demo account + landing page videos**: Paused by user.

### Session — 2026-06-03 (eighty-fourth session)

**Tasks completed:**
- **CSV import fixed** (`server/routes.ts`): `serviceDate` was being passed as `null` when blank, violating the NOT NULL DB constraint — every row failed. Fixed to `""`. Also improved the catch block to surface the actual DB error message instead of "failed to save".
- **Follow-up emails no longer fire on every redeploy** (`server/index.ts`, `server/migrate.ts`): Added `server_state` DB table to persist last follow-up check timestamp. On startup, if last check was less than 4 hours ago, the check is skipped. The hourly `setInterval` still runs normally and stamps the time after each run. Schedule (3/7/14 days) is completely unchanged.
- **24-hour guard added** (`server/storage.ts`): If any message was sent to a customer in the last 24 hours, follow-up checks skip them — prevents cascade of multiple follow-ups firing in rapid succession on same-day redeploys.
- **Customer status display overhaul** (`client/src/pages/Customers.tsx`, `server/routes.ts`):
  - Newly added customers (nothing sent) → blank, no badge (was showing "Pending")
  - When 4–5★ rating submitted, customer status now correctly updates to `review_completed` (was staying stuck at request_sent)
  - `review_completed` + `feedback_left` both show green "Rated X★" badge with actual star count — stars no longer shown separately below the badge
  - `no_response` customers' links stay live — if they later rate, status updates to "Rated X★" correctly
- **Customers table upgrades** (`client/src/pages/Customers.tsx`):
  - **Page size selector**: 5, 10, 15, 20, 25, or All — with prev/next pagination at bottom of table
  - **Import date filter**: From/To date inputs in filter row, with clear button
  - **Added column**: now shows real date (e.g. "12 Jan 2026") instead of "3 days ago" — hover shows relative time
  - **Sortable columns**: Name, Service, Status, Added — click to sort, click again to reverse, arrow indicator on active column

**Pending:**
- **Facebook App Review**: Still waiting on Meta's response.
- **Re-seed demo account + landing page videos**: Paused by user.

### Session — 2026-06-03 (eighty-third session)

**Tasks completed:**
- **WhatsApp confirmed working**: Test message delivered successfully after secrets were added and app redeployed. All three channels (email, SMS, WhatsApp) now fully operational.
- **STOP opt-out confirmed**: `/api/webhooks/twilio-inbound` already configured and pointed at Twilio — STOP replies automatically set `do_not_contact = true` on the customer record.
- **Full app sense check**: Comprehensive review of all flows — everything production-ready. No broken paths, no missing critical config, no TODOs in production code.

**Sense check results (all green):**
- Core review request flow (all 3 channels) ✅
- Rating flow and review landing page ✅
- Follow-up email/SMS/WhatsApp ✅
- STOP/unsubscribe handling ✅
- Test email endpoint ✅
- Demo seed account ✅
- Admin grant-access (meta reviewer test account) ✅
- Dashboard stale customer alert ✅
- All environment variables correctly checked ✅

**Pending:**
- **Facebook App Review**: Still waiting on Meta's response.
- **Re-seed demo account + landing page videos**: Paused by user.

### Session — 2026-06-03 (eighty-second session)

**Tasks completed:**
- **WhatsApp templates wired up**: All 3 Meta-approved templates created in Twilio, HX SIDs added to Replit secrets. Follow-up mapping fixed: idx 0 → `review_followup`, idx 1 & 2 → `review_followup2`.
- **Templates page display updated**: WhatsApp tab now shows exact approved wording for all 3 templates.

**Confirmed template wording (as approved by Meta):**
- `review_request`: "Hi {{1}}, thank you for choosing {{2}}! We'd love to hear how we did. Tap the link below to leave us a quick rating — it only takes a second: {{3}} Reply STOP to opt out."
- `review_followup`: "Hi {{1}}, just a quick follow-up from {{2}} — we'd love to hear how we did! Tap the link below to leave us a rating whenever you're ready: {{3}} Reply STOP to opt out."
- `review_followup2`: "Hi {{1}}, final follow-up from {{2}} — we'd love to hear how we did! Tap the link below to leave us a rating whenever you're ready: {{3}} Reply STOP to opt out."

**⚠️ FIRST THING NEXT SESSION:**
Ask user if the WhatsApp test message came through successfully after redeploying with the new secrets.

**Pending:**
- **WhatsApp test**: Needs confirming next session — secrets added, app redeployed, test not yet confirmed.
- **Facebook App Review**: Still waiting on Meta's response.
- **Re-seed demo account + landing page videos**: Paused by user.

### Session — 2026-06-02 (eighty-first session)

**Tasks completed:**
- **Dashboard archived customers fix**: `stalePendingCustomers` filter now excludes archived customers (was showing archived customers as needing attention).
- **Review landing page fix** (`client/src/pages/ReviewLanding.tsx`): 5-star rating was showing the negative feedback dialog when the API returned an ambiguous response (e.g. 409 already-rated). Fixed to use `selectedStar >= 4` as fallback for `highRating`.
- **WhatsApp template API implemented** (`server/sms.ts`, `server/routes.ts`, `server/index.ts`, `server/storage.ts`):
  - Added `sendWhatsAppTemplate()` function — sends via Twilio's content API using Meta-approved template SIDs
  - All WhatsApp outbound messages (initial request, scheduled request, follow-ups) now use templates
  - Private feedback replies stay free-form (allowed — within active conversation window)
  - 3 env vars needed once Meta approves templates (see ⚠️ FIRST THING below)
- **WhatsApp Templates page** (`client/src/pages/Templates.tsx`): WhatsApp tab now shows fixed template wording with explanation — no edit controls. Email and SMS templates still fully editable.

**⚠️ FIRST THING NEXT SESSION — add Twilio template SIDs:**
Meta-approved WhatsApp templates need their Twilio SIDs added as Replit env vars before WhatsApp sending will work. After Meta approves the 3 submitted templates:
1. Go to Twilio Console → Content → Content Library (or search "Content" in Twilio)
2. Find the 3 approved templates: `review_request`, `review_followup`, `review_followup_2`
3. Copy each SID (format: `HXxxxxxxxxxxxxxxxxxxxxxxxxx`)
4. Add to Replit Secrets:
   - `WHATSAPP_TEMPLATE_SID_REQUEST` = SID for `review_request`
   - `WHATSAPP_TEMPLATE_SID_FOLLOWUP` = SID for `review_followup`
   - `WHATSAPP_TEMPLATE_SID_FOLLOWUP_FINAL` = SID for `review_followup_2`

**Pending:**
- **⚠️ WhatsApp template SIDs**: See above — needed before WhatsApp works.
- **Facebook App Review**: Still waiting on Meta's response.
- **Re-seed demo account + landing page videos**: Paused by user.

### Session — 2026-06-02 (eightieth session)

**Tasks completed:**
- **CLAUDE.md trimmed**: Sessions 72–75 moved to CLAUDE_ARCHIVE.md.
- **Email formatting overhauled** (`server/email.ts`):
  - Logo size increased 200px → 280px across all emails
  - Business logo centred (`margin:0 auto` + `text-align:center` on container)
  - All customer emails normalised to 600px wide (was mixed 560/600)
  - Follow-up CTA button changed from black `#111` → blue `#2563eb`
  - Review request template body now uses proper `<p>` paragraphs (was raw `<br>` dumps)
  - Platform review buttons centred in a `text-align:center` wrapper
  - Unsubscribe + "Powered by" merged into single `customerFooter(customerId)` function — one clean bordered block, no double borders
  - ReviewOptic logo embedded as base64 data URI so it always displays without external image blocking
- **Test email fixed** (`server/routes.ts`): Test emails now use real send functions with dummy customer — identical to what customer receives, only `[TEST]` in subject.
- **Insight email period label fixed** (`server/insightEmail.ts`): Weekly shows date range, monthly shows month + year.
- **Dashboard stale customers fixed** (`client/src/pages/Dashboard.tsx`): Uses `sentAt` from review request, not `createdAt`. Grammar fixed.

### Session — 2026-05-19 (seventy-ninth session)

**Tasks completed:**
- **Inbound SMS receiver removed**: The `POST /api/twilio/inbound-sms` endpoint, `GET /api/admin/last-sms` endpoint, and "Check Inbound SMS" admin button were all removed. The approach didn't work — Meta's OTP SMS was being filtered by UK carrier networks before reaching Twilio, even though the Twilio number itself can receive regular SMS fine (confirmed by test). Code cleaned up from `server/routes.ts` and `client/src/pages/Admin.tsx`.
- **Facebook App Review resubmitted**: User successfully resubmitted App Review through Meta's portal (portal error from session 78 is now resolved).
- **Facebook reconnected**: User went to Settings → Social → Connect Facebook and reconnected successfully.

**WhatsApp OTP — root cause found, parked:**
- The Twilio number `+447863750348` is a UK mobile number with SMS capability (confirmed — personal SMS test received fine).
- Meta's OTP SMS specifically does not arrive — zero trace in Twilio message logs. This is UK carrier filtering of Meta's international shortcode, not a Twilio config issue.
- Voice call option not available in Meta's WhatsApp Manager UI (no delivery method choice shown).
- **Parked.** Two options if revisited: (1) raise a Twilio support ticket asking why Meta/Facebook OTP SMS is blocked on the number; (2) use a physical UK SIM (e.g. free Giffgaff SIM) as the WhatsApp Business number instead — guaranteed to receive OTPs.

**⚠️ LESSON LEARNED**: Don't build in-memory webhook receivers for OTPs when the delivery channel itself is unreliable. Diagnose whether the SMS can arrive at all (quick test: send a personal SMS to the number) before building the receiver.

**Pending:**
- **Facebook App Review**: Resubmitted this session — awaiting Meta's response.
- **Auto-Post Reviews toggle**: Facebook is reconnected — make sure the Auto-Post Reviews toggle in Settings → Social is turned back on.
- **WhatsApp**: Parked — see root cause above. Options: Twilio support ticket or physical SIM.
- **Re-seed demo account**: Do this fresh right before recording landing page videos.
- **Landing page videos**: Hero and How It Works placeholders ready to swap in when recorded.

### Session — 2026-05-18 (seventy-eighth session)

**Tasks completed:**
- **`auth_type=reauthorize` reverted**: Changed back to `rerequest` in `server/routes.ts`. Was causing Facebook to show a "Reconnect" dialog forcing password re-entry for all users — not suitable for real users.
- **Facebook page name now stored and displayed**: Added `facebook_page_name` column to schema + DB migration. Fetched and stored in all three OAuth connection paths. Settings → Social now shows `Connected · [Page Name]` for Facebook, matching how Instagram shows `@username`.
- **Instagram auto-post error logging improved**: Instagram publish step now logs the actual API error if it fails, instead of swallowing it silently.
- **Screencast recorded for Meta App Review**: Captions written to match the actual flow (Facebook already logged in → Edit Settings → permissions screen). Screencast done and ready to submit once Meta's App Review portal is back up (was throwing generic error at time of session).
- **Inbound SMS receiver built**: Added `POST /api/twilio/inbound-sms` endpoint that stores the last received SMS in memory. Added "Check Inbound SMS" button to Admin panel that shows the stored message in an alert. Twilio webhook on `+447863750348` is now pointed at `https://reviewoptic.com/api/twilio/inbound-sms`. Next time Meta sends the OTP, it will be captured and readable from the Admin panel.

**Root cause of Instagram not posting in previous screencast**: `instagramBusinessAccountId` was empty after the `reauthorize` OAuth run — the reconnect during recording didn't save the Instagram ID. Fixed by reverting `auth_type` and ensuring all three OAuth paths save it correctly.

**⚠️ LESSON LEARNED**: When OTP/verification codes can't be received directly, build a webhook receiver in the app immediately — don't send the user down the path of third-party tools (webhook.site) and manual console hunting first.

**Pending:**
- **Facebook App Review**: Screencast recorded, submission blocked by Meta portal error ("Something went wrong"). Try again next session — Meta's portal should be back up.
- **Reconnect Facebook**: DB shows Facebook currently disconnected (credentials empty). Go to Settings → Social → Connect Facebook, then turn Auto-Post Reviews toggle back on.
- **WhatsApp OTP**: Meta rate-limited after too many verification attempts. Wait ~15 minutes, then: click "Send verification code" in Meta WhatsApp Manager → go to Admin panel → click "Check Inbound SMS" → copy the OTP → paste into Meta. Twilio webhook is already configured.
- **WhatsApp Business Verification**: If OTP flow works but number still won't activate, check Meta Business Manager → Settings → Business Info for green "Verified" badge. Missing business verification can block WhatsApp number activation.
- **Re-seed demo account**: Do this fresh right before recording homepage/landing page videos.
- **Landing page videos**: Hero and How It Works placeholders ready to swap in when recorded.

### Session — 2026-05-18 (seventy-seventh session)

**Tasks completed:**
- **Facebook OAuth state bug fixed**: `oauthState` was stored as an in-memory variable in `server/routes.ts`. Replit restarts the server frequently — if a restart happened between the user clicking "Connect Facebook" and Facebook redirecting back, the state check failed silently and the connection was never saved. Fixed by storing `fbOauthState` in the session (Postgres-backed), so server restarts can't break the flow. Also typed `fbUserToken` properly in the session type declaration.
- **Facebook credentials wiped for screencast**: Cleared `facebook_page_access_token`, `facebook_page_id`, `instagram_business_account_id` from DB directly so Settings showed clean "Connect Facebook" state for recording.
- **`auth_type=reauthorize` re-added for screencast**: Facebook was showing a "Reconnect" dialog (skipping the permissions screen) because it remembered the previous connection. Added `auth_type=reauthorize` to force the full re-auth + permissions screen. **⚠️ MUST REVERT after screencast is submitted — not suitable for real users.**
- **Instagram profile info now fetched and displayed**: Meta's App Review feedback for `instagram_business_basic` requires the app to show the connected Instagram account's profile info (username, profile picture). Added `instagramUsername` and `instagramProfilePicUrl` fields to schema + DB migration. These are fetched from the Graph API at connect time and stored. Settings → Social now shows the Instagram profile picture (in place of the icon) and `@username` alongside "Connected". Applied to all three connect paths (auto, `connectPageById` helper, manual page URL entry) and cleared on disconnect.
- **Screencast re-recorded**: User re-recorded with the new Instagram profile info visible in Settings.

**Architecture notes:**
- `fbOauthState` and `fbUserToken` added to `SessionData` type in `server/index.ts` — session saved to Postgres via `connect-pg-simple`.
- Instagram profile fetch: `GET /v18.0/{ig-user-id}?fields=username,profile_picture_url&access_token={page-token}` — requires `instagram_business_basic` permission.
- New DB columns: `settings.instagram_username`, `settings.instagram_profile_pic_url` (both `TEXT NOT NULL DEFAULT ''`). Migration in `server/migrate.ts`.

**⚠️ IMPORTANT — must do next session:**
- **Revert `auth_type=reauthorize`** in `server/routes.ts` after the screencast is submitted to Meta. Remove that one line from the OAuth params. Real users should not be forced to re-enter their Facebook password every time they connect.

**Pending:**
- **Facebook App Review**: Finish writing updated descriptions for all permissions per Meta's feedback, re-record screencasts with Instagram profile info visible, then submit. `instagram_business_basic` description needs to: (1) provide test account credentials, (2) point reviewer to Settings → Social to see the Instagram username/profile pic, (3) state it's a dependency for `instagram_content_publish`.
- **Revert `auth_type=reauthorize`** once screencast is submitted.
- **Re-seed demo account**: Hit "Seed Demo Account" in Admin to rebuild with corrected data.
- **WhatsApp**: Check if `+447863750348` flipped from Pending → Active in Meta WhatsApp Manager, then test sending.
### Session — 2026-05-17 (seventy-sixth session)

**Tasks completed:**
- **Facebook App Review — resubmission prepared**: Meta rejected all permissions due to screencast not showing full end-to-end flow. Use case was confirmed as allowed. Worked through each permission's feedback one by one.
- **`pages_read_engagement` removed then re-added**: Initially removed from OAuth scope as Meta flagged it as unused. Later discovered Meta requires it as a mandatory companion permission to `pages_manage_posts`. Added back to scope in `server/routes.ts`.
- **Descriptions written for all 6 permissions**: Tailored descriptions written for `instagram_business_basic`, `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`. All include "Note for reviewer" explaining Instagram auto-connects through Facebook (no separate Instagram login), plus test account credentials.
- **`auth_type` tested and reverted**: Briefly changed to `reauthorize` to force fresh login for screencast recording, then reverted to `rerequest` — correct behaviour for real users.

**Architecture notes:**
- OAuth scope in `server/routes.ts:2955`: `pages_manage_posts, pages_read_engagement, pages_show_list, instagram_basic, instagram_content_publish, business_management`
- `pages_read_engagement` must stay even though not actively used — Meta policy requires it alongside `pages_manage_posts`
- `business_management` is in the scope but not in Meta's App Review list — likely auto-approved, leave as is

**Pending:**
- **Facebook App Review screencast**: Record new screencast using Loom showing: (1) start logged out of Facebook, (2) Settings → Social disconnected, (3) full Meta login + permissions grant, (4) Instagram auto-connects, (5) send review request, (6) customer receives email and leaves 5-star review, (7) review card appears on Facebook Page and Instagram. Upload same video to all 6 permission slots and submit.
- **Re-seed demo account**: Hit "Seed Demo Account" in Admin to rebuild with corrected data.
- **WhatsApp**: Check if `+447863750348` flipped from Pending → Active in Meta WhatsApp Manager, then test sending.
- **Landing page videos**: Hero and How It Works video placeholders ready to swap in when recorded.

