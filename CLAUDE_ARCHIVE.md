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
