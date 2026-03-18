# CLAUDE_ARCHIVE.md — Archived Session Logs

Older session logs moved here to keep CLAUDE.md under 30k chars.

---

### Session — 2026-03-11

**Tasks completed:**
- Created `CLAUDE.md` with working rules and session start checklist
- Created `landing.html` — simple one-page HTML with the "ReviewOptic" heading
- Connected the project to GitHub (`https://github.com/ReviewOptic/reviewoptic`) and pushed all code

**Lessons learned:**
- When user asks to undo, revert exactly what was changed — nothing more, nothing less
- Always check for duplicate instances of a UI element (e.g. desktop + mobile) before calling a change done
- Never ask the user to paste sensitive tokens in chat — find a safer alternative next time

---

### Session — 2026-03-12

**Tasks completed:**
- Added time-of-day greeting to dashboard header: "Good morning / Good afternoon / Good evening" based on user's local time
- Added rotating daily inspirational quote beneath the greeting, themed around great service and earning reviews (8 quotes, cycles daily)

---

### Session — 2026-03-12 (second session)

**Tasks completed:**
- Made all 5 dashboard stat cards clickable — each navigates to a dedicated detail page
- Created `client/src/pages/StatDetail.tsx` — a single page handling 5 views via `/stat/:view` URL
- Registered `/stat/:view` route in `App.tsx`

**Lessons learned:**
- When user says "see more detail" on a UI element, clarify whether they want a modal or a full page before building — they may have a strong preference

---

### Session — 2026-03-12 (third session)

**Tasks completed:**
- Added custom date range filter to all 5 stat detail views
- Fixed stat card number mismatches — unified all 5 stats to use `customers`/`reviews` tables directly
- Added `no_response` auto-transition: customers in `request_sent` status for 14+ days automatically move to `no_response`
- Built automated follow-up sending respecting `followUpEnabled`, `maxFollowUps`, and timing settings
- Added "Requests sent" count per customer column on Customers page
- Added "Response Required" badge on Requests detail page

**Lessons learned:**
- Always check that dashboard stat numbers and detail page numbers use the same data source and same filter logic before shipping
- When adding a visual indicator, confirm with user before committing — they may only want part of the change

---

### Session — 2026-03-14

**Tasks completed:**
- Dashboard: capped Recent Activity to 5 items, made rows more compact
- Add Customer form: made email OR phone compulsory (not both)
- Templates: added video recording, voice note recording, and mode toggle (Text / Video / Voice Note)
- Settings → Review Platforms: added Trustpilot, TripAdvisor, Checkatrade, MyBuilder
- Settings → Social (new tab): Facebook + LinkedIn OAuth, auto-post toggle, Connected Accounts card
- Auto-post to social: 4/5 star reviews automatically post to connected Facebook Page and/or LinkedIn Company Page
- API credentials moved to Replit Secrets (environment variables)

**Issues still open:**
- Facebook OAuth app is in development mode — needs Meta app review before real users can connect
- LinkedIn `r_organization_social` scope may need additional approval
- Facebook/LinkedIn access tokens expire (~60 days) — token refresh not built

**Lessons learned:**
- Always clarify who owns/uses a feature before building
- Never ask the user to paste API secrets in chat — direct them to Replit Secrets or environment variables

---

### Session — 2026-03-15

**Tasks completed:**
- Live email sending via Resend — `server/email.ts` wired into manual requests and automated follow-ups
- Resend domain setup (`reviewoptic.com`) — DNS records added in Namecheap
- Email verification on signup — verification link sent via Resend
- Password rules tightened: min 8 chars, one number, one symbol
- Admin impersonation feature — `/admin` page, impersonation log table
- Admin panel: manual email verify, delete account, promote/demote admin
- Signup form expanded: first name, last name, company name
- New signups auto-added as customers in admin account
- Default templates created on signup (4 templates per account)

**Lessons learned:**
- When user is on Claude Code (not Replit UI), there is no Run/Stop button — restart server via bash
- Always grab verification tokens from the database when email isn't sending
- When seeding data for an existing account, do it directly via SQL

---

### Session — 2026-03-15 (second session)

**Tasks completed:**
- Resend domain verified — MX record was missing; added in Namecheap
- GitHub push unblocked — LinkedIn Client Secret was in git history; user rotated and bypassed secret scanning
- `dotenv` installed and wired into server — `.env` file required for Claude Code sessions
- `.env` file created with all secrets; added to `.gitignore`
- `isAdmin` added to login response — admin panel now shows correctly after login
- Login autofill bug partially fixed — DOM element read on submit
- Multi-user architecture confirmed already built — all tables scoped by `accountId`

**Lessons learned:**
- Replit Secrets only load when app runs via Replit UI — `.env` file is required for Claude Code sessions
- Browser autofill doesn't trigger React `onChange` — read login form values from DOM elements directly
- `FormData.get()` on React controlled inputs returns React state value — use `elements.namedItem()` instead

### Session — 2026-03-15 (third session)

**Tasks completed:**
- Login autofill bug fully fixed — removed `value` prop from email/password inputs (made uncontrolled), added `key={mode}` to reset form on mode switch, replaced `navigate("/")` with `useEffect` watching `user` state to prevent race condition
- Email verification race condition fixed — `VerifyEmail.tsx` now calls `refreshUser()` before navigating so ProtectedRoutes doesn't bounce user back to /login
- Resend verification email — added button on "Check your email" screen and a `POST /api/auth/resend-verification` endpoint
- Re-signup with unverified email — server now detects existing unverified account and resends verification instead of erroring
- "Failed to send request" bug fixed — `scheduledAt` was sent as a JSON string but Drizzle expected a Date object; fixed with `new Date(req.body.scheduledAt)`
- Privacy Policy and T&Cs pages created; T&Cs checkbox on signup
- SMS sending via Twilio — UK number detection, normalisation, alphanumeric sender ID
- Customers now editable — inline edit mode on CustomerDetail; "Edit Contact" in dropdown on Customers list
- Platform selection on send — toggle buttons for Google/Facebook/Trustpilot/TripAdvisor/Checkatrade/MyBuilder
- Company logo upload — Settings → Business tab; upload, crop, remove. Stored via multer
- Auto-save settings — 1.5s debounced auto-save with indicator
- Logo in emails with position (left/centre/right) respected; Logo position moved to Templates page

**Lessons learned:**
- Browser autofill race condition: make login inputs uncontrolled AND use `useEffect` on user state for navigation
- When email verification redirects fail, call `refreshUser()` before `navigate()`

### Session — 2026-03-15 (fourth session)

**Tasks completed:**
- Fixed data isolation bug — bootstrap-account data migrated to admin's real account on server start
- Fixed React Query cache leaking between accounts — `queryClient.clear()` on login/logout/impersonation
- Cleaned admin customer list to show only real ReviewOptic subscribers
- Fixed analytics data isolation and channel breakdown date filtering
- Redesigned Analytics page — 4 stat cards, date range filter, channel filter, donut + bar charts

**Lessons learned:**
- React Query caches under same key for all users — always call `queryClient.clear()` on any account switch
- When diagnosing data leaks, check the DB directly to confirm whether issue is data layer or cache layer

### Session — 2026-03-16 (fifth session)

**Tasks completed:**
- Switched AI between OpenAI and Anthropic at user request (ended on OpenAI gpt-4o-mini)
- Improved error logging on AI endpoint and frontend error toasts

**Lessons learned:**
- Replit env vars only inject at container start — process restart alone is not enough

### Session — 2026-03-16 (sixth session)

**Tasks completed:**
- Fixed OpenAI API key not loading (needed Stop + Run)
- Fixed logo URL being relative in emails — prefixed with REPLIT_DEV_DOMAIN
- Logo now clickable link in emails; `websiteUrl` field added to settings
- Added editable email subject field to Send Request dialog
- Rebuilt admin panel Metrics tab with full analytics, date filter, Revenue & Payments skeleton

**Lessons learned:**
- Always check Resend (and other API) response objects — errors are in body, not thrown
- Replit env vars only update on full container restart

### Session — 2026-03-16 (seventh session)

**Tasks completed:**
- Enforced read-only impersonation at server level (blocks all POST/PATCH/PUT/DELETE when impersonating)
- UI hides Add Customer, Import CSV, Send Request, Edit Contact, DNC, Delete when impersonating
- Fixed impersonate button condition — now shows for all users except self

**Lessons learned:**
- When hiding UI elements for impersonation, check ALL pages for duplicate buttons
- Hard refresh (Ctrl+Shift+R) needed in browser to pick up Vite hot-reload changes

### Session — 2026-03-17 (eighth session)

**Tasks completed:**
- Business logo in sidebar (dynamic fetch from /api/settings)
- Business logo on login page (from /api/public/branding — no auth)
- Removed duplicate logos, spacing tweaks

**Lessons learned:**
- Use inline `style` width-based sizing for logos — Tailwind height classes can be overridden by parent
- Public pages needing settings data: always create a dedicated no-auth endpoint

### Session — 2026-03-17 (ninth session)

**Tasks completed:**
- Stripe payments — Standard (£49/mo, £539/yr) and Agency (£149/mo, £1,639/yr)
- /pricing page with Stripe Embedded Checkout modal
- /billing/success page — updates plan in DB, refreshes auth
- DB migration: plan_type, plan_period, stripe_customer_id, stripe_subscription_id
- Paywall: non-paying non-admin users redirected to /pricing
- /billing page: current plan, renewal, invoices, Customer Portal button
- Plan breakdown in admin metrics

**Notes (still relevant):**
- Stripe is in test mode — use `4242 4242 4242 4242`
- Stripe Customer Portal must be activated in Stripe Dashboard before use
- Webhook endpoint at /api/billing/webhook — set STRIPE_WEBHOOK_SECRET once registered

**Lessons learned:**
- Always wrap entire async route handler in try/catch for billing routes
- Call `refreshUser()` on page load when impersonating to get fresh server-computed flags
- Use `<a href>` not `navigate()` for back buttons on public pages
