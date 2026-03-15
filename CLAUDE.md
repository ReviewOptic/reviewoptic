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

### Session — 2026-03-11

**Tasks completed:**
- Created `CLAUDE.md` with working rules and session start checklist
- Created `landing.html` — simple one-page HTML with the "ReviewOptic" heading
- Connected the project to GitHub (`https://github.com/ReviewOptic/reviewoptic`) and pushed all code

**Fixes applied:**
- Changed star logo box colour from blue to green, then reverted to blue on user request

**Issues discovered:**
- GitHub token was shared in plain chat — user was advised to revoke it and generate a new one. A fresh token will be needed before the next push to GitHub.
- The `main` branch had no remote tracking set up initially — now fixed, tracking `origin/main`

**Notes for next session:**
- Confirm GitHub token has been revoked and a new one created
- `landing.html` is a bare-bones placeholder — may need styling to match the app
- No active bugs or broken features at end of session

**Lessons learned:**
- When user asks to undo, revert exactly what was changed — nothing more, nothing less
- Always check for duplicate instances of a UI element (e.g. desktop + mobile) before calling a change done
- Never ask the user to paste sensitive tokens in chat — find a safer alternative next time

### Session — 2026-03-12

**Tasks completed:**
- Added time-of-day greeting to dashboard header: "Good morning / Good afternoon / Good evening" based on user's local time
- Added rotating daily inspirational quote beneath the greeting, themed around great service and earning reviews (8 quotes, cycles daily)

**Fixes applied:**
- None

**Issues discovered:**
- None

**Notes for next session:**
- Dashboard header is now dynamic — greeting + daily quote both in place
- `landing.html` still a bare-bones placeholder — may want to style it to match the app at some point
- No active bugs or broken features at end of session

### Session — 2026-03-12 (second session)

**Tasks completed:**
- Made all 5 dashboard stat cards clickable — each navigates to a dedicated detail page
- Created `client/src/pages/StatDetail.tsx` — a single page handling 5 views via `/stat/:view` URL:
  - `/stat/requests` — customers list with period + status filters and summary bar
  - `/stat/pending` — pending customers with per-row Follow-up button and confirm step
  - `/stat/reviews` — reviews list with star, platform, and period filters
  - `/stat/response-rate` — visual funnel (sent → clicked → reviewed) with period filter and quick links
  - `/stat/avg-rating` — headline average, star breakdown bars, platform/period filters, recent reviews list
- Registered `/stat/:view` route in `App.tsx`
- Stat cards on dashboard now have hover effect (cursor + background change) to indicate they're clickable

**Fixes applied:**
- Initially built stat card detail as dialogs — user asked for full pages instead, rebuilt as dedicated route

**Issues discovered:**
- None

**Notes for next session:**
- All 5 stat card drill-down pages are live and working
- The "Follow-up" button on the Pending page calls the send-request API — worth testing with a real customer
- `landing.html` still a bare-bones placeholder
- No active bugs or broken features at end of session

**Lessons learned:**
- When user says "see more detail" on a UI element, clarify whether they want a modal or a full page before building — they may have a strong preference

### Session — 2026-03-12 (third session)

**Tasks completed:**
- Added custom date range filter ("Custom Range" period pill + from/to date inputs) to all 5 stat detail views
- Fixed stat card number mismatches — dashboard was counting from `reviewRequests` table, detail pages from `customers` table; unified all 5 stats to use `customers`/`reviews` tables directly
- Fixed "Requests This Month" to count only customers where a request was actually sent (status ≠ `pending_request`), so dashboard number matches the detail page "Sent" count
- Fixed "Clicked" summary card to exclude `review_completed` customers (no double-counting with Reviewed)
- Removed `pending_request` customers from the Requests detail list (they shouldn't appear in a "sent" view)
- Added `no_response` auto-transition: customers in `request_sent` status for 14+ days since first `sentAt` automatically move to `no_response` — runs on server start and every hour
- Built automated follow-up sending: 2nd request sent after `followUp1Days`, 3rd after `followUp2Days` (both read from Settings), respects `followUpEnabled` and `maxFollowUps`
- Added "Requests sent" count per customer — visible as a column on the Customers page and inline on the Requests stat detail list
- Changed CustomerDetail back button to use `window.history.back()` so it returns to whatever page the user came from (not always `/customers`)
- Added "Response Required" badge (red) on Requests detail page for customers with `no_response` status who also have private feedback

**Fixes applied:**
- `requestsThisMonth` stat was counting from `reviewRequests` table (sent emails) instead of `customers` table — fixed to match detail page
- `pendingRequests` stat was counting from `reviewRequests` table — fixed to count customers with `status = request_sent && !doNotContact`
- `responseRate` stat was using `reviewRequests` click data — fixed to use customer statuses (sent vs review_completed)
- 14-day no-response clock was starting from `customer.createdAt` — fixed to start from first `sentAt` in `reviewRequests`

**Issues discovered:**
- None active at end of session

**Notes for next session:**
- Automated follow-ups create `reviewRequests` records but don't yet send real emails/SMS — that integration is still pending
- `landing.html` still a bare-bones placeholder
- Follow-up timing is fully driven by Settings → Follow-Ups sliders (`followUp1Days`, `followUp2Days`, `maxFollowUps`, `followUpEnabled`)
- "Response Required" badge only shows on the Requests stat detail page, not on the main Customers list

**Lessons learned:**
- Always check that dashboard stat numbers and detail page numbers use the same data source and same filter logic before shipping
- When adding a visual indicator (e.g. coloured border), confirm with user before committing — they may only want part of the change

### Session — 2026-03-14

**Tasks completed:**
- Dashboard: capped Recent Activity to 5 items, made rows more compact (single line, smaller icon)
- Dashboard: removed Golden Hour button
- Add Customer form: made email OR phone compulsory (not both) — updated frontend disabled logic and server-side validation
- Templates: added video recording (camera + mic) to all template types — records in browser, uploads to server, saved as `videoUrl`
- Templates: added voice note recording (mic only) — uploads to server, saved as `audioUrl`
- Templates: added Text / Video / Voice Note mode toggle — selecting video or voice hides the text body/subject fields
- Settings → Review Platforms: added Trustpilot, TripAdvisor, Checkatrade, MyBuilder alongside existing Google and Facebook
- Settings → Business: added Social Media Profiles section (Facebook, Instagram, LinkedIn) — moved to Social tab later in session
- Settings → Social (new tab): created with Social Media Profiles card, Connected Accounts card (Facebook, Instagram via Facebook, LinkedIn), auto-post toggle, and message template
- Facebook + LinkedIn OAuth: built full OAuth flow — `GET /auth/facebook`, `GET /auth/facebook/callback`, `GET /auth/linkedin`, `GET /auth/linkedin/callback`, disconnect endpoints
- Auto-post to social: when a 4 or 5 star review comes in, automatically posts to connected Facebook Page and/or LinkedIn Company Page using customisable message template with `{stars}` and `{customer_name}` merge tags
- API credentials (Facebook App ID/Secret, LinkedIn Client ID/Secret) moved to Replit Secrets (environment variables) — removed from Settings UI entirely
- Instagram shown as "Connected via Facebook" in Connected Accounts — no separate OAuth needed
- Analytics: added Reviews by Platform bar chart at the bottom of the Analytics page

**Fixes applied:**
- Removed X (Twitter) from Social Media Profiles list (user decision — X API costs $100/mo)
- Corrected OAuth architecture: app credentials are server env vars, users only see Connect/Disconnect buttons

**Issues discovered:**
- Multi-user/multi-tenant architecture not yet built — currently one shared settings record for everything. This must be built before selling to multiple businesses. Each business needs their own account with their own social tokens, review platform links, etc.
- Real email/SMS sending still not wired up — automated follow-ups and review requests don't send actual messages yet
- Facebook OAuth app is in development mode — needs Meta app review before real users can connect their pages
- LinkedIn `r_organization_social` scope may need additional approval from LinkedIn
- Facebook/LinkedIn access tokens expire (~60 days) — token refresh not yet built

**Notes for next session:**
- **Priority: multi-user accounts** — most critical thing before going live with paying customers
- Video personalisation with ElevenLabs voice cloning is parked as a premium feature for the pricing page
- `landing.html` still a bare-bones placeholder
- OAuth redirect URIs are currently hardcoded to `http://localhost:5000` — need updating to production URL when deployed

**Lessons learned:**
- Always clarify who owns/uses a feature before building — "post reviews to social" meant business users posting to their own pages, not the app owner posting to theirs
- Never ask the user to paste API secrets in chat — direct them to Replit Secrets or environment variables instead

### Session — 2026-03-15

**Tasks completed:**
- Live email sending: created `server/email.ts` with `sendReviewEmail` — wired into manual review requests and automated follow-ups. Emails personalised with `{{first_name}}`, review link pulled from settings
- Resend domain setup: walked user through adding DNS records (DKIM, SPF, DMARC) in Namecheap for `reviewoptic.com`. Domain verification pending (takes a few hours)
- Email verification on signup: new users must verify email before logging in. Verification link sent via Resend; falls back to server console log if no API key. Existing users auto-marked as verified
- Password rules tightened: minimum 8 characters, at least one number, at least one symbol — enforced on both frontend and server
- Admin impersonation feature: `/admin` page lists all users with stats; admin can impersonate any non-admin user, see a banner while impersonating, and stop with one click. Every impersonation session logged to `admin_impersonation_log` table
- Admin panel expanded: manual email verify, delete account (with confirm), promote/demote admin, impersonation log tab with full history
- Signup form expanded: collects first name, last name, and company name (replacing single business name field)
- New signups auto-added as customers in admin account: when someone signs up to ReviewOptic they appear in the admin Customers tab so review requests can be sent to them as a user would
- Default templates created on signup: every new account gets 4 default templates (email review request, email follow-up, SMS review request, SMS follow-up) using `{{first_name}}`
- `{{first_name}}` merge tag added: available in all templates, shown in merge tag reference bar, used in default fallback email

**Fixes applied:**
- `null value in column "username"` error on signup — fixed by adding `DEFAULT ''` to legacy username column in migration
- Admin panel not showing after logout/login — was a stale server process; fixed by restarting server
- Password placeholder still showing "At least 6 characters" on register form — removed
- Existing admin account had no templates — seeded directly via SQL

**Issues discovered:**
- Resend domain not yet verified — emails will send once DNS propagates (may take up to 24h). Verification links currently print to server console as fallback
- `APP_URL` env var is not set — verification links use `http://localhost:5000` as base. Must set `APP_URL` to the Replit app URL in Secrets before going live so email links work correctly
- OAuth redirect URIs still hardcoded to `http://localhost:5000` — needs updating when deploying to production
- Facebook/LinkedIn access tokens expire (~60 days) — token refresh not yet built
- SMS sending not yet wired up — channel field stored but no SMS provider (Twilio etc.) connected

**Notes for next session:**
- **Set `APP_URL` in Replit Secrets** to the full Replit app URL (e.g. `https://xxx.riker.replit.dev`) — critical for email verification links to work for new signups
- Resend domain should be verified by next session — test a real review request email once confirmed
- Admin panel is fully functional — user can sign up, get auto-added as customer, and receive review request emails
- Default templates are created for all new accounts; existing admin account templates were seeded manually
- `landing.html` still a bare-bones placeholder

**Lessons learned:**
- When user is on Claude Code (not Replit UI), there is no Run/Stop button — restart the server via bash commands instead
- Always grab verification tokens from the database when email isn't sending, rather than asking user to find logs themselves
- When seeding data for an existing account, do it directly via SQL rather than building a one-time endpoint

### Session — 2026-03-15 (second session)

**Tasks completed:**
- Resend domain verified — MX record was missing; walked user through adding it in Namecheap under Mail Settings. Domain now verified and emails live
- GitHub push unblocked — LinkedIn Client Secret was in git history (`.replit` file, commit `09a6d69`). User rotated secret in LinkedIn Developer Portal, updated Replit Secrets, then bypassed GitHub secret scanning via the unblock URL. All 17 pending commits pushed
- `dotenv` installed and wired into server — added `import "dotenv/config"` to `server/index.ts` so `.env` file is loaded on startup. Replit Secrets are NOT loaded when running via Claude Code (only via Replit UI), so a `.env` file is required
- `.env` file created with all secrets (RESEND_API_KEY, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, APP_URL). Added `.env` to `.gitignore`
- `isAdmin` added to login response — was missing from `/api/auth/login` endpoint so admin panel never showed after login. Fixed by adding `isAdmin: user.isAdmin` to the response JSON
- Login autofill bug partially fixed — browser autofill doesn't trigger React `onChange`, so first login attempt with autofilled credentials failed silently. Fixed by reading values directly from DOM elements (`e.currentTarget.elements.namedItem(...)`) in submit handler rather than from React state
- Multi-user architecture confirmed already built — each signup creates isolated account; all tables (customers, reviews, templates, settings) are scoped by `accountId`. No additional work needed

**Fixes applied:**
- Login endpoint missing `isAdmin` in response — admin panel not showing on login
- Login autofill bug — credentials had to be entered twice; fixed with DOM element read on submit

**Issues discovered:**
- Login autofill bug not fully resolved — still occasionally requires credentials twice. Needs more investigation next session
- Forgot password email was delayed (Resend showed "delivery delayed") when sending to a `reviewoptic.com` address — may be a self-send issue. Needs testing with an external email address
- `APP_URL` in `.env` is the Replit dev URL — will need updating when moving to a custom domain

**Notes for next session:**
- `.env` file exists at project root with all secrets — do NOT commit it (already in `.gitignore`)
- Replit Secrets are also set but only apply when running via Replit UI — `.env` is what matters for Claude Code sessions
- Test forgot password with a Gmail/Outlook address to confirm end-to-end email flow works
- Login autofill bug still needs a proper fix — entering credentials twice is still happening intermittently
- SMS sending (Twilio) not yet built — next major feature after email is confirmed working
- OAuth redirect URIs still use `localhost:5000` — update when going to production

**Lessons learned:**
- Never ask the user to paste secrets in chat — even API keys. Always use `.env` file or environment variables
- Replit Secrets only load when app runs via Replit UI — when using Claude Code, a `.env` file is required for secrets to be available
- Browser autofill doesn't trigger React `onChange` — always read login form values from DOM elements directly, not from React state
- `FormData.get()` on React controlled inputs returns the React state value, not the DOM value — use `elements.namedItem()` instead

### Session — 2026-03-15 (third session)

**Tasks completed:**
- Login autofill bug fully fixed — removed `value` prop from email/password inputs (made uncontrolled), added `key={mode}` to reset form on mode switch, replaced `navigate("/")` with `useEffect` watching `user` state to prevent race condition
- Email verification race condition fixed — `VerifyEmail.tsx` now calls `refreshUser()` before navigating so ProtectedRoutes doesn't bounce user back to /login
- Resend verification email — added button on "Check your email" screen and a `POST /api/auth/resend-verification` endpoint
- Re-signup with unverified email — server now detects existing unverified account and resends verification instead of erroring
- "Failed to send request" bug fixed — `scheduledAt` was sent as a JSON string but Drizzle expected a Date object; fixed with `new Date(req.body.scheduledAt)`
- Privacy Policy page created — `/privacy` route, full template with UK-law framing, opens as a new page
- Terms & Conditions page created — `/terms` route, tailored to user's answers: UK law, monthly/annual billing, auto-renewal, 30-day data deletion on cancellation, illegal businesses and spam prohibited, liability disclaimer
- T&Cs checkbox on signup — user must tick "I agree to the Terms & Conditions" before registering
- SMS sending via Twilio — created `server/sms.ts` with UK number detection, normalisation, and alphanumeric sender ID (max 11 chars from business name). Non-UK numbers skipped with log entry
- Customers now editable — inline edit mode on CustomerDetail page (pencil/save/cancel icons); "Edit Contact" option added to dropdown on Customers list page
- Platform selection on send — toggle buttons for Google, Facebook, Trustpilot, TripAdvisor, Checkatrade, MyBuilder when sending a review request (both from Customers list and CustomerDetail page)
- Company logo upload — Settings → Business tab; upload, crop (Square / 2:1 / 3:1 / 4:1), and remove logo. Stored via `POST /api/settings/upload-logo` using multer
- Auto-save settings — replaced Save button with 1.5s debounced auto-save; "Saving…" / "Saved ✓" indicator in top-right of Settings page
- Logo in emails — all outgoing review request emails include the business logo at the top, with position (left/centre/right) respected
- Logo position control moved to Templates page — removed from Settings; now appears inside the email TemplateEditor when a logo is uploaded. Position is saved immediately via PATCH `/api/settings`
- Logo preview in email template — the existing "Preview (sample data)" box now shows the logo at the correct position, on a white background matching a real email

**Fixes applied:**
- Login autofill race condition — `navigate("/")` fired before React state updated; replaced with `useEffect` on `user`
- `scheduledAt` date parsing — server was receiving ISO string, not Date; fixed with `new Date(req.body.scheduledAt)`
- `APP_URL` misconfigured in `.env` — had `APP_URL=APP_URL=https://...`; fixed to single key=value
- `ADMIN_EMAIL` missing from `.env` — new signups weren't being added to admin customers; added `ADMIN_EMAIL=hello@reviewoptic.com`
- Email from address — cannot use user's own domain as sender; fixed to use business name as display name with `noreply@reviewoptic.com`, and `replyTo` set to business email

**Issues discovered:**
- Twilio trial account blocks alphanumeric sender IDs — SMS shows "sent" in logs but doesn't deliver. User deferred Twilio upgrade
- WhatsApp integration not yet built — deferred until Twilio upgraded
- OAuth redirect URIs still use `localhost:5000` — must update before going to production
- Facebook/LinkedIn access tokens expire (~60 days) — token refresh not built
- Free trial terms, cancellation policy, and refund policy in T&Cs are placeholder text — user to fill in

**Notes for next session:**
- `.env` file has all secrets — do NOT commit it
- SMS infrastructure is built and wired up — just needs a paid Twilio account to deliver
- WhatsApp will use the same Twilio number as SMS once account is upgraded
- T&Cs and Privacy Policy have placeholder sections — user needs to complete before going live
- Logo position is saved to settings (not per-template) — applies to all email templates
- `uploads/` folder is gitignored — logos stored locally, not in cloud storage yet

**Lessons learned:**
- Browser autofill race condition: make login inputs uncontrolled AND use `useEffect` on user state for navigation — both fixes are needed together
- When email verification redirects fail, call `refreshUser()` before `navigate()` to ensure auth context is updated first

### Session — 2026-03-15 (fourth session)

**Tasks completed:**
- Fixed data isolation bug: all existing customers/templates/reviews were stranded on `bootstrap-account` while the admin user had been given a UUID accountId. Added migration to move all bootstrap-account data to the admin's real account on server start
- Added migration to detect and fix any future non-admin users sharing the bootstrap account — gives each their own isolated account
- Fixed React Query cache leaking between accounts: added `queryClient.clear()` on both login and logout so each session always fetches fresh data from the correct account
- Fixed same cache leak on admin impersonation start — cache now cleared when entering AND leaving impersonation
- Cleaned admin customer list: removed 9 test/demo customers, leaving only real ReviewOptic subscribers (auto-added on signup). Admin account now only shows paying/trial users of the app
- Fixed analytics data isolation: analytics was counting from `review_requests` table (inflated by follow-ups) while dashboard counted unique customers. Now both use same methodology
- Fixed analytics channel breakdown counting all-time data regardless of date filter
- Redesigned Analytics page: added 4 summary stat cards, 7/30/60/90d + custom date range filter, channel filter (All/Email/SMS/WhatsApp), donut chart for channel breakdown, star distribution bar chart (1★–5★), tightened layout to 3-column grid

**Fixes applied:**
- Bootstrap-account data stranded after multi-user migration — fixed via SQL migration
- Non-admin account had admin's settings written to it (React Query cache poisoning) — cleared on logout/login/impersonation
- Non-admin's settings were reset to clean defaults after being polluted
- Analytics numbers didn't match dashboard — unified to count from customers table
- Analytics channel breakdown was all-time, not filtered by selected period

**Issues discovered:**
- `uploads/` folder (logos, videos, audio) is local-only — not persisted across server restarts or deployments. Needs cloud storage (e.g. S3 or Cloudflare R2) before going to production
- OAuth redirect URIs still hardcoded to `localhost:5000` — must update before production
- Facebook/LinkedIn access tokens expire ~60 days — no refresh flow built
- Twilio trial account still blocks SMS delivery — needs upgrade

**Notes for next session:**
- Admin customer list now only shows ReviewOptic subscribers — this is the intended behaviour going forward
- React Query cache is cleared on every login/logout/impersonation — account data is fully isolated
- Analytics custom date range uses `from`/`to` query params on `/api/analytics`
- `.env` file has all secrets — do NOT commit it
- T&Cs and Privacy Policy still have placeholder sections the user needs to fill in

**Lessons learned:**
- React Query caches under the same key for all users — always call `queryClient.clear()` on any account switch (login, logout, impersonation start/stop)
- When diagnosing "data leaking between accounts", always check the DB directly with psql to confirm whether the issue is in the data layer or the cache layer
