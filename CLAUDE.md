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

### Session — 2026-03-16 (fifth session)

**Tasks completed:**
- Switched AI message generation from OpenAI (`gpt-4o-mini`) to Anthropic Claude (`claude-haiku-4-5-20251001`) at user request, then switched back to OpenAI at user request
- Installed `@anthropic-ai/sdk`, then removed it and reinstalled `openai` package
- Improved error logging on AI generate endpoint — now logs `err.status` and `err.code` as well as `err.message`
- Improved frontend error toasts — now show the actual server error message instead of a generic string
- User rotated all secrets (Resend, Session, Twilio, Facebook, LinkedIn, Database) and added new OpenAI API key to Replit Secrets

**Fixes applied:**
- Tightened error surfacing on `/api/ai/generate-message` so real errors reach the client toast

**Issues discovered:**
- **AI message generation still broken** — new OpenAI API key is being rejected with 401 (invalid_api_key). Root cause not yet resolved. Likely either: (1) no billing/credits on the OpenAI account, or (2) key copied incorrectly into Replit Secrets
- Replit Secrets are only picked up on a **full container restart** (Stop + Run in Replit UI) — killing and restarting the server process alone is not enough

**Notes for next session:**
- First thing: ask user to do a full Replit restart (Stop + Run), then test "Generate with AI" — it may work once the container picks up the latest secret
- If still 401, user needs to check billing on platform.openai.com and generate a fresh key
- All other secrets were rotated this session — everything except OpenAI should be working normally
- `.env` file confirmed never committed to git — secret rotation was precautionary

**Lessons learned:**
- Replit environment variables (secrets) are only injected at container start — restarting the Node process does not pick up new secret values

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

### Session — 2026-03-16 (sixth session)

**Tasks completed:**
- Fixed OpenAI API key not loading — Replit container needed a full Stop + Run to pick up new secret; confirmed key valid via curl test
- Fixed company logo not showing in emails — logo was stored as relative path `/uploads/...`; now prefixed with `https://$REPLIT_DEV_DOMAIN` to build a full public URL
- Made logo a clickable link in emails — added `websiteUrl` field to settings schema, migration, and Settings page; logo wraps in `<a>` tag if website is set
- Auto-prefix `https://` on website URL save — server normalises URLs without protocol on `PATCH /api/settings`
- Added email subject field to Send Request dialog on Customers page — pre-filled with "How was your experience with [Business Name]?", editable, email-only
- Fixed custom subject being ignored — email.ts `else` branch now uses `template?.subject` instead of hardcoded string
- Fixed Send Request button requiring a message — disabled until `aiMessage` is non-empty
- Fixed Resend API key invalid — user rotated key; diagnosed via improved error logging on email send result
- Removed debug console.log statements added during email diagnosis (logging stays for now as useful)
- Rebuilt admin panel Metrics tab — full analytics dashboard with: user metrics, review request metrics + feed, 4 Recharts charts, retention, conversion funnel, feature usage, power users, alerts, Revenue & Payments skeleton
- Added date range filter to admin metrics — dropdown (7/30/90/custom) + date inputs; all SQL queries parameterised with from/to; auto-refreshes every 60s
- Added Export PDF (window.print()) and Export CSV (all metrics as combined CSV) to admin metrics header
- Built Revenue & Payments section skeleton — summary stat cards, transactions + refunds table with columns, Export CSV button inline with heading; ready to wire up when payment provider connected
- Removed Impersonation Log tab from admin panel — impersonate button on users table kept

**Fixes applied:**
- Resend API key was invalid — diagnosed via result logging in sendReviewEmail
- Logo URL was relative — prefixed with REPLIT_DEV_DOMAIN in email.ts
- Custom email subject was ignored when no template body — fixed else branch in email.ts
- `website_url` column missing from DB — added to migrate.ts; runs on server start
- `pool` was unexported from storage.ts — exported it so admin metrics route can run raw SQL

**Issues discovered:**
- Replit dev domain in logo URLs will break if domain changes — needs APP_URL set in Secrets for production
- `uploads/` folder is still local-only — logos lost on server restart; needs cloud storage before production
- Impersonation log is still being written to DB (backend unchanged) — frontend tab just hidden

**Notes for next session:**
- Revenue & Payments section is fully scaffolded — just needs real data wired in when payment provider connected (Stripe noted as likely choice)
- Website URL in settings auto-prefixes `https://` if missing — users don't need to type it
- Admin metrics auto-refresh every 60 seconds; date filter applies to charts, feed, feature usage, and top users (summary stat cards remain rolling 7-day)
- Stop + Run in Replit required any time Secrets are updated
- Debug logging still present in email.ts (`[sendReviewEmail] called...`, `result:`) — remove before going to production if noisy

**Lessons learned:**
- Always check Resend (and other API) response objects — errors are returned in the response body, not thrown as exceptions, so `.catch()` won't catch them
- Replit env vars only update on full container restart (Stop + Run), not process restart alone

### Session — 2026-03-16 (seventh session)

**Tasks completed:**
- Enforced read-only impersonation at the server level — `requireAuth` middleware now blocks all POST/PATCH/PUT/DELETE requests when `req.session.originalUserId` is set
- Updated ImpersonationBanner in Layout.tsx to show "READ ONLY" badge prominently
- Hid "Add Customer" and "Import CSV" buttons on Customers page when impersonating
- Hid "Add Customer" buttons (header + empty state) on Customers page when impersonating
- Hid "Add Customer" buttons on Dashboard (header + Quick Actions) when impersonating
- Greyed out Edit button on all Templates when impersonating
- Hid Send Request, Edit Contact, DNC, and Delete options in Customers dropdown when impersonating (View Details kept)
- Fixed impersonate button not showing in admin Users tab — changed condition from `!u.isAdmin` to `u.id !== user?.id` so button shows for all other users
- Allowed impersonating admin users — removed `!u.isAdmin` restriction on frontend and backend

**Fixes applied:**
- Impersonate button was hidden for non-admin users despite role showing "User" — root cause was condition `!u.isAdmin` which was unexpectedly false; fixed by keying off `u.id !== user?.id` instead
- Empty state "Add Customer" button on Customers page was still showing when impersonating an account with no customers

**Issues discovered:**
- Settings page still allows editing when impersonating — not addressed this session; server-side block will reject saves but UI doesn't make it obvious

**Notes for next session:**
- Read-only impersonation is enforced at both server (API blocks all writes) and UI level (buttons hidden/greyed)
- `isImpersonating` flag comes from `user?.isImpersonating` via `useAuth()` — same pattern used across Dashboard, Customers, Templates
- Settings page could be improved: show a read-only indicator or disable save button when impersonating
- Impersonate button now shows for ALL users including admins (admin-to-admin impersonation is allowed)

**Lessons learned:**
- When hiding UI elements for impersonation, check ALL pages for duplicate buttons (e.g. Dashboard had two "Add Customer" buttons, Customers had an empty-state one)
- Hard refresh (Ctrl+Shift+R) needed in browser to pick up Vite hot-reload changes when they don't auto-apply

### Session — 2026-03-17 (eighth session)

**Tasks completed:**
- Added business logo to sidebar — `LogoOrText` component now fetches `/api/settings` and shows the uploaded logo (centred, `h-24`) instead of just text; falls back to "ReviewOptic" text if no logo uploaded
- Added business logo to login/signup page — fetches from new public endpoint `/api/public/branding`; shows uploaded logo large (`width: 100%, maxWidth: 320px`) above the form; falls back to `/logo.png` if none set
- Added `/api/public/branding` endpoint — no auth required; returns admin account's logo URL and business name for use on public-facing pages
- Removed "ReviewOptic" text next to logo in sidebar — logo only; text shows as fallback if no logo
- Removed duplicate small ReviewOptic logo from login page — now shows uploaded logo OR platform logo, not both
- Removed gray background from logo thumbnail in Settings → Business tab
- Spacing tweaks on login page — reduced whitespace under logo (`mb-5` → `mb-0`)

**Fixes applied:**
- Logo in sidebar was showing `/logo.png` (static file) instead of user's uploaded business logo — switched to dynamic fetch from settings
- Login page had two logos stacked — replaced with conditional: uploaded logo if available, else platform logo

**Issues discovered:**
- Logo sizing via Tailwind `h-*` classes can be unreliable when parent has `max-w-sm` — switched to inline `style` width-based sizing for the login page logo which is more predictable
- `/api/public/branding` endpoint requires a full Replit Stop + Run to activate after first deploy

**Notes for next session:**
- Sidebar logo is centred, `h-24`, pulls from `/api/settings` (authenticated)
- Login page logo pulls from `/api/public/branding` (no auth), uses admin account's settings
- `uploads/` folder is still local-only — logos lost on server restart; needs cloud storage before production
- Settings page still allows editing when impersonating — server blocks writes but UI doesn't show a clear read-only state

**Lessons learned:**
- Use inline `style` width-based sizing (e.g. `style={{width:"100%", maxWidth:"320px"}}`) for logos on the login page — Tailwind height classes can be overridden by parent container constraints
- When a public page needs data from settings, always create a dedicated no-auth endpoint rather than trying to reuse the authenticated one

### Session — 2026-03-17 (ninth session)

**Tasks completed:**
- Added Stripe payments — Standard (£49/mo, £539/yr) and Agency (£149/mo, £1,639/yr) plans
- Built `/pricing` page with monthly/annual toggle, savings badges ("1 month free"), and Stripe Embedded Checkout (opens in modal overlay — no redirect away from page)
- Built `/billing/success` page — confirms payment with Stripe, updates plan in DB, refreshes auth, auto-redirects to dashboard
- DB migration adds `plan_type`, `plan_period`, `stripe_customer_id`, `stripe_subscription_id` to users table
- Added paywall: non-paying, non-admin users redirected to `/pricing` on any protected route
- Admin accounts bypass paywall entirely; impersonating admins also bypass it
- Added `requiresPayment` flag to `/api/auth/me` response — computed server-side so client logic is simple
- Added "View pricing plans" link on login/signup page
- Added "Billing" link in sidebar for non-admin users; admins don't see it
- Built `/billing` page for paying users: current plan, renewal date, upgrade-to-annual option, invoice list with PDF download, "Manage payment details" button
- Stripe Customer Portal integration for card/address changes (`POST /api/billing/portal`)
- `GET /api/billing/subscription` — live subscription status from Stripe
- `GET /api/billing/invoices` — last 10 invoices with PDF links
- Added plan breakdown to admin metrics — 4 purple stat cards showing Standard/Agency × Monthly/Annual user counts
- Installed `@stripe/stripe-js` and `@stripe/react-stripe-js`

**Fixes applied:**
- Billing portal returning non-JSON error — wrapped entire handler in try/catch, now always returns JSON
- Admin impersonation blocked by paywall — `requiresPayment` now always false when `originalUserId` is set (impersonating)
- Stale auth data causing redirect loop on pricing page — added `refreshUser()` call on pricing page mount when impersonating
- Back button on pricing page: goes to `/` if logged in, `/login` if not (using `<a href>` not `navigate()` which was unreliable from public routes)
- Async errors in billing routes not caught by Express — all billing handlers now fully wrapped in try/catch
- `billing.plan_type` query wrapped in try/catch in `/api/auth/me` so missing columns (pre-migration) don't break login

**Issues discovered:**
- Stripe Customer Portal must be activated in Stripe Dashboard (Billing → Customer portal → Activate) before the "Manage payment details" button works — server now returns a readable error message if not activated
- `uploads/` folder still local-only — logos lost on server restart; needs cloud storage before production
- OAuth redirect URIs still hardcoded to `localhost:5000` — must update before production

**Notes for next session:**
- Stripe is in **test mode** — use card `4242 4242 4242 4242` for testing
- Full Replit **Stop + Run** required after any server-side change for migrations to run and env vars to load
- Stripe Customer Portal needs activating in Stripe Dashboard before it works
- `requiresPayment` is computed server-side in `/api/auth/me` — single source of truth for paywall logic
- Billing page is at `/billing` (protected route, non-admin only); pricing page is at `/pricing` (public)
- Webhook endpoint at `/api/billing/webhook` handles `customer.subscription.deleted` — set `STRIPE_WEBHOOK_SECRET` in Replit Secrets once webhook is registered in Stripe Dashboard
- Plan breakdown stat cards in admin metrics use `planBreakdown` array from `/api/admin/metrics`

**Lessons learned:**
- Always wrap the entire async route handler in try/catch for billing routes — a failing DB query outside the catch block will cause an unhandled rejection and return HTML instead of JSON
- When an impersonating admin has stale auth data, call `refreshUser()` on the page they land on to immediately fetch fresh server-computed flags
- Use `<a href="...">` not wouter's `navigate()` for back buttons on public pages — `navigate()` can behave unexpectedly when the target is a protected route

### Session — 2026-03-18 (tenth session)

**Tasks completed:**
- Added `chat_messages` table — `id`, `user_id` (FK to users, cascade delete), `message`, `response`, `created_at`
- Built `POST /api/chat` endpoint — rate limited (4 messages per 5-minute sliding window), calls OpenAI `gpt-4o-mini` with business name in system prompt, saves real AI response to DB
- Built `GET /api/chat/history` endpoint — returns all messages for the user plus `usedInWindow` count
- Built `ChatWidget.tsx` — floating chat button (bottom-right), slide-up panel, message history, streaming typing indicator, cooldown banner, suggested questions on empty state
- Added chat widget to `Layout.tsx` so it appears on all authenticated pages (hidden when impersonating)
- Chat log cleared on logout (`DELETE FROM chat_messages WHERE user_id = $1` in logout endpoint)
- Rate limit: 4 messages per 5-minute sliding window — slots open gradually as messages age out
- Suggested questions shown on empty state: Google reviews, best time to ask, negative review response, write a request

**Fixes applied:**
- OpenAI rate limit errors were showing raw API error text as a chat bubble — server now returns friendly message; frontend shows errors as red bubbles
- `throw { status, ...json }` pattern was unreliable with React Query — switched to always resolving mutationFn and checking `data.ok` / `data.httpStatus` in `onSuccess`
- Incorrect cooldown timing in `onSuccess` (set to `now + 15min` instead of when oldest message expires) — removed manual cooldown set, let `refetch()` + `useEffect` handle it as single source of truth
- OpenAI API key not loading until full Stop + Run in Replit

**Issues discovered:**
- OpenAI API requires credits/billing — free tier will block requests silently with rate limit errors
- Full Stop + Run required in Replit after any Secrets change

**Notes for next session:**
- Chat widget is in `Layout.tsx` — applies to all authenticated pages
- Rate limit constants (`LIMIT`, `WINDOW_MS`) are defined locally in both `routes.ts` (server) and `ChatWidget.tsx` (client) — update both if changing
- Chat history is deleted on logout — each login starts a fresh conversation
- Suggested questions are hardcoded in `ChatWidget.tsx` around line 172

**Lessons learned:**
- When diagnosing "limit after one message", check the DB directly — the real cause was OpenAI's own rate limiting returning an error that looked like our limit message
- Never expose raw third-party API error messages to users — always catch and return a friendly string
- Replit secrets only load on full container restart (Stop + Run), not process restart alone
