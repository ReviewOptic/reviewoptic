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

*(Sessions 18–30 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-03-26 (thirty-first session)

**Tasks completed:**
- **Unsubscribe for platform emails (ReviewOptic → user)**: New `email_unsubscribed` boolean column on `users` (migration added). `GET /api/unsubscribe/platform?uid=X` public endpoint sets the flag and returns a confirmation HTML page. `sendPlatformReviewRequest` now accepts `id` in the user param and embeds a real unsubscribe link in the email footer. `runPlatformReviewRequests` in index.ts and `runMonthlyInsightEmails` in insightEmail.ts both filter out users with `email_unsubscribed = true`.
- **Unsubscribe for customer emails (business → customer)**: `GET /api/unsubscribe/customer?cid=X` public endpoint sets `do_not_contact = true` on the customer and returns a confirmation HTML page. Real unsubscribe link added to `sendPreScreenEmail` and `sendReviewEmail` footers.
- **Admin panel tracking**: `/api/admin/users` now returns `emailUnsubscribed` per user. Admin Users tab shows orange "Unsub" badge on each unsubscribed user, plus a count badge in the header showing how many users have unsubscribed.

**Architecture notes:**
- Two helper functions in email.ts: `customerUnsubscribeFooter(customerId)` and `platformUnsubscribeFooter(userId)` — centralised so any new email type can add them in one line
- Customer unsubscribe reuses existing `do_not_contact` flag — no new column needed; customer automatically appears as DNC in the Customers tab
- Platform unsubscribe link is NOT added to: verification email, password reset, cancellation email (all transactional)

### Session — 2026-03-26 (thirty-second session)

**Tasks completed:**
- **Follow-up email subject lines fixed**: All three follow-up subjects updated in both code defaults (Templates.tsx) and DB migration (migrate.ts):
  - Follow-up 1: "Just checking in"
  - Follow-up 2: "A polite reminder"
  - Follow-up 3: "We'd still love to hear from you"
- Removed `{{business_name}}` from all follow-up subjects — redundant since it already shows in the From field
- Follow-up 2 previously showed "one last nudge" which was misleading (Follow-up 3 comes after it)

**Notes for next session:**
- **Templates page — still to review**: SMS tab, WhatsApp tab, and Recordings tab not yet checked this session — user wants to continue tab by tab
- **Server restart required** for `email_unsubscribed` migration and follow-up subject fix migrations to run
- **Referral programme activation**: needs (1) server route `GET /referral/:slug` → redirect to `/signup?ref={accountId}`, (2) store `referred_by_account_id` on new accounts at registration, (3) admin view of referral counts, (4) update offer text in Referral tab
- `POST /api/reviews` endpoint still orphaned in routes.ts — safe to remove
- Instagram auto-posting still not built
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- Pre-existing TS errors in Analytics.tsx, Tutorial.tsx, routes.ts — carry forward

### Session — 2026-03-26 (thirty-third session)

**Tasks completed:**
- **SMS/WhatsApp template overhaul**: Response templates (After 4–5★, After 1–3★) no longer show char limits on SMS/WhatsApp tabs — they're shown in a pop-up, not sent as SMS. Follow-up template descriptions cleaned up.
- **SMS character limit properly calculated**: Limit = 86 chars for follow-up body (160 total − short link ~62 chars − `\nReply STOP` 11 chars). Char counter shows `(max 86)` for follow-up SMS, `(max 149)` for custom SMS.
- **Greyed-out link placeholder**: Follow-up and custom SMS/WA template editor shows a non-editable placeholder below the textarea showing the auto-appended link.
- **SMS opt-out**: `\nReply STOP` appended to every outgoing SMS in `sendReviewSMS` (covers initial + all follow-ups).
- **Short URL `/r/:id`**: Server redirect added (`GET /r/:id` → `/review?rid=:id`). SMS sends now use `/r/UUID` (~10 chars shorter). Saves space for body text.
- **Greetings removed from SMS/WA follow-ups**: All follow-up templates no longer start with "Hi {{first_name}}" — straight to the message. All seeding, migrations, and frontend defaults updated.
- **Twilio STOP webhook**: `POST /api/webhooks/twilio-inbound` — when customer replies STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT, their number is matched and `do_not_contact = true` set. Follow-up runner already filters DNC. Webhook URL: `https://reviewoptic.com/api/webhooks/twilio-inbound`
- **Test send button**: "Test" button on every template slot. Email → sends to account email via Resend. SMS/WhatsApp → prompts for phone number, sends with `[TEST]` prefix.
- **AI generation SMS limit**: Prompts updated to 86-char limit, no greeting. Server-side enforcement strips greeting then hard-truncates if AI still exceeds limit.
- **CSV export on Customers page**: Export button next to Import. Downloads current filtered list with: Name, Email, Phone, Channel, Status, Star Rating, Date Sent, Date Clicked.
- **Platform clicks in insight emails**: Insight emails now include a "Platform clicks this period" section showing per-platform click counts with a note to check their profiles for new reviews.
- **All TS errors fixed**: Analytics.tsx (`colors.clicks` → `colors.sms`), Tutorial.tsx (Set spread → `Array.from`), routes.ts (missing `id` on CSV import, `user.name` → `user.firstName`, `settings.phone` → request body phone).
- **Tutorials & Guides fully updated**: howtos.ts updated for all new features (test send, opt-out, STOP reply, CSV export, insight email platform clicks, 86-char SMS limit). New how-to added: "How to export your customer data". TIPS and video descriptions updated in Tutorial.tsx.

**Architecture notes:**
- `sendReviewSMS` in sms.ts appends `\nReply STOP` to ALL outgoing customer SMS — single place, covers everything
- Short link: `/r/:id` is an Express redirect before the SPA catch-all — safe. Only used for SMS (not email/WA)
- Twilio webhook expects `application/x-www-form-urlencoded` (Twilio default). Returns empty TwiML `<Response></Response>`
- Test send for SMS/WA accepts `phone` from request body; frontend uses `window.prompt` to collect it
- Platform clicks query in insightEmail.ts: `SELECT platform, COUNT(*) FROM review_platform_clicks WHERE account_id = $1 AND created_at >= $2 GROUP BY platform`
- SMS follow-up AI prompt: 86-char limit enforced in prompt + server strips greeting + hard-truncates at word boundary

**Notes for next session:**
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console (SMS number + WhatsApp sender → "A message comes in"). Remind every session until confirmed.
- **Server restart required** for all migrations to run (SMS body corrections, email_unsubscribed, follow-up subjects, positive/negative template IDs)
- **Referral programme activation**: needs (1) server route `GET /referral/:slug` → redirect to `/signup?ref={accountId}`, (2) store `referred_by_account_id` on new accounts, (3) admin view, (4) update offer text
- `POST /api/reviews` endpoint still orphaned in routes.ts — safe to remove
- Instagram auto-posting still not built
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- **Next feature ideas discussed**: QR code (quick win), Zapier webhook for auto-adding customers (high impact), re-engagement campaigns for past customers

### Session — 2026-03-26 (thirty-fourth session)

**Tasks completed:**
- **Template reset-defaults bug fixed**: Root cause was `created_at` column in INSERT — that column doesn't exist in schema. Removed it and added try-catch to surface errors properly. Reset button now works on all tabs.
- **migrate.ts INSERT fix**: Same `created_at` issue existed in two new-account seeding INSERT statements. Both fixed.
- **Private feedback auto-refresh**: Dashboard private feedback and customers queries now use `refetchInterval: 15000` — new feedback appears within 15 seconds without page reload.
- **Response template subjects fixed**: `{{business_name}}` removed from `response_positive` and `response_negative` email subjects. New defaults: "Thank you for your rating" (positive) and "We'd love to make this right" (negative). Fixed in migrate.ts (unconditional UPDATE) and Templates.tsx defaults.
- **WhatsApp response template bodies fixed**: DB had fragment values ("Thanks again," / "Please reply..."). Fixed by unconditional UPDATE in migrate.ts to canonical bodies across all response template rows.
- **`{{owner_name}}` merge tag added**: Resolves to first name from Settings → "Your Name". Added to: rating endpoint resolver, test-send resolver, follow-up runner (storage.ts), email.ts send functions, and Templates.tsx preview/merge-tags list. Sign-off `{{owner_name}}\n{{business_name}}` added to all response template defaults.
- **Email follow-up templates now include rating link**: Previously used `sendPreScreenEmail` (which ignores template body and sends a fixed star-rating format). Changed to new `sendFollowUpEmail` function in email.ts that sends the template body + a "Rate your experience →" CTA button, with the rating link auto-appended.
- **Subject field hidden on email response templates**: After 4–5★ and After 1–3★ slots on the email tab no longer show a subject field in the card view — they display in a pop-up, not as emails.
- **Opening line hidden in email response template editor**: Email tab for response templates hides the Opening line field (only relevant for SMS/WA pop-up display).
- **Test button removed from response template slots**: After 4–5★ and After 1–3★ slots across all tabs no longer show a Test button — they're not sent as messages.
- **Canonical defaults enforced everywhere**: New account seeding (routes.ts), migrate.ts unconditional UPDATEs, and reset-defaults endpoint all use identical template bodies/subjects. Any new account or reset will get the same clean defaults.
- **Private feedback ignore button**: New `PATCH /api/private-feedback/:id/ignore` endpoint sets `responded = true`. X button added to each feedback row on Dashboard — dismisses item from "Needs Response" list without sending a reply. Arrow button retained for full respond dialog.
- **Tutorials & Guides fully updated**: How-to for templates updated ({{owner_name}}, response pop-up behaviour, Reset to Defaults). Private feedback how-to updated (respond vs ignore, auto-refresh). Two new video entries added (private feedback, CSV export). Tips updated ({{owner_name}} in personalisation tip, ignore flow in private feedback tip).

**Architecture notes:**
- `sendFollowUpEmail` in email.ts: takes customer, settings, ratingLink, template — sends template body + "Rate your experience →" button. `{{owner_name}}` resolved from `settings.ownerName.split(" ")[0]`
- Response templates (response_positive / response_negative): displayed in ReviewLanding pop-up only — never sent as email/SMS. Subject field = "opening line" shown in bold above body in the dialog
- Canonical positive body: `"We hope you enjoyed your experience with {{business_name}} and our {{service_type}}!...{{owner_name}}\n{{business_name}}"`
- Canonical negative body: `"We would appreciate your feedback on how we can improve for next time and will be in touch.\n\nMany thanks,\n{{owner_name}}\n{{business_name}}"`
- `{{service_type}}` strip: regex removes `" and our {{service_type}}"` at resolve time if service type is empty
- Ignore endpoint: `PATCH /api/private-feedback/:id/ignore` → sets `responded=true, response='ignored'` — reuses existing `updatePrivateFeedback` in storage.ts

**Notes for next session:**
- **⚠️ SERVER RESTART REQUIRED** for all pending migrations: `email_unsubscribed`, follow-up subject fixes, response template body/subject fixes, `positive_template_id`/`negative_template_id` columns, canonical template resets
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **Referral programme activation**: needs (1) server route `GET /referral/:slug` → redirect to `/signup?ref={accountId}`, (2) store `referred_by_account_id` on new accounts, (3) admin view, (4) update offer text
- `POST /api/reviews` endpoint still orphaned in routes.ts — safe to remove
- Instagram auto-posting still not built
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- **Next feature ideas**: QR code (quick win), Zapier webhook for auto-adding customers (high impact), re-engagement campaigns for past customers

### Session — 2026-03-27 (thirty-fifth session)

**Tasks completed:**
- **Pricing plans replaced**: Standard/Agency → Lite (£29/mo or £319/yr, 10 requests/mo) and Pro (£49/mo or £539/yr, unlimited). Plan type union updated in auth-types.ts.
- **Lite plan limit enforcement**: `POST /api/review-requests` checks monthly count (excluding follow-ups). Returns 403 with `code: "lite_limit_reached"` and `resetDate`. Frontend shows dialog with reset date and upgrade link.
- **Billing tab updated**: Shows plan name, limit detail, trial badge. Plan switching (Lite↔Pro, monthly→annual) via new Stripe checkout session. Old subscription cancelled when switching.
- **14-day free trial**: Added to checkout for new subscribers only (checked via `stripe_customer_id`). Billing tab shows trial end date.
- **Register page rebuilt**: Standalone clean page (was a redirect stub). Logo, form, T&C checkbox, subtitle about trial. After registration → `/pricing`. Handles duplicate account gracefully.
- **FAQ page created**: `/faq` with 5 sections, 22 questions. Linked from pricing, login, register pages.
- **Cancelled plan behaviour updated**: Cancelled users can browse full app — only `POST /api/review-requests` is blocked at API level. `CancelledBanner` in Layout.tsx is amber, updated wording. App.tsx no longer locks cancelled users to analytics-only.
- **Permanent account deletion**: `DELETE /api/account` endpoint cancels Stripe, sets `scheduled_for_deletion_at = NOW() + 30 days`, logs out. Two-step confirmation dialog in Billing.tsx. Daily runner in index.ts deletes accounts past their window. `scheduled_for_deletion_at` column added via migration.
- **Plan rename migration**: `UPDATE users SET plan_type = 'pro' WHERE plan_type IN ('standard', 'agency')` added to migrate.ts.
- **T&Cs updated**: Price guarantee (Section 5), free trial (Section 6), cancellation/deletion (Section 7) all written properly.
- **Privacy Policy updated**: Neon/Stripe placeholders filled. Private feedback data collection documented.
- **Features page updated**: Lite/Pro split noted. Instagram removed (not built).
- **Template reset preserved**: Added `schema_migrations` table to migrate.ts. All one-time template UPDATE blocks now gated with `once()` helper — user customisations survive server restarts.
- **Custom Templates section**: Now starts expanded by default so "Add template" button is immediately visible.
- **ReviewLanding low-rating wording**: Footnote changed to *"This doesn't affect your right to leave a public review."*
- **FAQ/Privacy/T&Cs updated**: All three reflect the exact footnote wording and service-recovery framing for the pre-screen.
- **Billing upgrade buttons**: Fixed condition — now shows for `status === "trialing"` as well as `"active"`.

**Architecture notes:**
- `schema_migrations` table: `CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR PRIMARY KEY, run_at TIMESTAMP DEFAULT NOW())`. Helper `once(name, fn)` checks before running, inserts after. Four migration names: `sentiment_prescreen_wording`, `response_template_defaults_v1`, `follow_up_subjects_v1`, `canonical_templates_v2`.
- `DELETE /api/account`: cancels Stripe sub, sets `scheduled_for_deletion_at`, clears session. Daily runner deletes in dependency order: clicks → feedback → requests → activity → templates → recordings → customers → settings → chat_messages → users.
- Lite limit query: `COUNT(*) FROM review_requests WHERE account_id = $1 AND (follow_up_count IS NULL OR follow_up_count = 0) AND DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', NOW())`

**Notes for next session:**
- **⚠️ SERVER RESTART REQUIRED** for `schema_migrations` table and `scheduled_for_deletion_at` column to be created
- **⚠️ TWILIO WEBHOOK NOT YET ACTIVATED** — must set `https://reviewoptic.com/api/webhooks/twilio-inbound` in Twilio console
- **Referral programme**: still pending (see above)
- `POST /api/reviews` endpoint still orphaned in routes.ts — safe to remove
- Instagram auto-posting still not built
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`
- **Next feature ideas**: QR code, Zapier webhook, re-engagement campaigns
