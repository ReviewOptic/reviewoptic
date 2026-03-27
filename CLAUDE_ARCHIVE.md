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

---

### Session — 2026-03-18 (eleventh session)

**Tasks completed:**
- Multiple templates — users can now create, delete, and rename templates
- "New Template" button top-right of Templates page; opens dialog with name, type, and two options: "Create blank" or "Generate with AI"
- Delete button (trash icon) on each template card with confirmation dialog
- Template name is editable inside the Edit view
- "Generate with AI" button inside each template editor to regenerate body (and subject for email) using OpenAI
- Added `DELETE /api/templates/:id` route and `deleteTemplate` method in storage
- Added `POST /api/ai/generate-template` endpoint — generates channel-appropriate body + subject using gpt-4o-mini
- Template selector in Send Request dialog — appears when multiple templates exist for the selected channel
- `templateId` sent to `POST /api/review-requests`; server uses specified template if provided

### Session — 2026-03-18 (twelfth session)

**Tasks completed:**
- Analytics PDF export — `html2canvas` + `jsPDF`; captures only the data section, adds programmatic text header
- Business name on Analytics page — fetches `/api/settings` and shows `businessName` as subtitle
- "Requests by Channel Over Time" chart — new `LineChart` with separate Email/SMS/WhatsApp lines
- Send Request dialog redesign — segmented toggle: "Use a template" / "Generate with AI"
- Trustpilot review ticker on login page — scrolling strip of green-starred review cards
- Added `GET /api/public/trustpilot-reviews` endpoint — falls back to hardcoded placeholders until API keys added

**Notes:**
- Trustpilot ticker auto-switches to live reviews once `TRUSTPILOT_API_KEY` + `TRUSTPILOT_BUSINESS_UNIT_ID` added to Replit Secrets

### Session — 2026-03-18 (thirteenth session)

**Tasks completed:**
- Fixed Replit Helium database migration — DATABASE_URL host patched `helium` → `localhost`; pg_ctl start added to workflow
- Fixed email verification links pointing to localhost — now uses `REPLIT_DEV_DOMAIN`
- Signup flow: Register → /pricing → pay → verify → dashboard; auto-login after registration
- Server-side paywall in `requireAuth` — free plan users get 402; billing routes exempt
- `complimentary` plan type added — bypasses paywall, excluded from admin metrics
- Admin user list now only shows verified + paid/complimentary users

**Infrastructure notes:**
- DATABASE_URL uses `@helium/` host — always patch to `@localhost/` at startup (done in `server/index.ts` and `server/storage.ts`)
- Admin account: `hello@reviewoptic.com`
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-03-19 (fourteenth session)

**Tasks completed:**
- 5 new analytics charts: Best Day to Send, Time to Review, Follow-up Effectiveness, Template Performance, Review Platform Breakdown
- Settings → Team: status pills, Resend invite button, `POST /api/team/:id/resend-invite`
- Subscription cancellation — `cancel_at_period_end: true` on Stripe; reactivate undoes it
- Cancelled plan state: `plan_type = 'cancelled'`; paywall allows GET /api/analytics + /api/settings only
- Cancelled plan gate: full-page lock screen + red banner
- Cancellation email sent automatically; logo added to all system emails
- Feedback & Feature Requests dialog — sends to hello@reviewoptic.com + auto-reply

**Architecture notes:**
- `plan_type` values: `'free'` (unused), `'standard'`, `'complimentary'` (bypasses paywall), `'cancelled'` (analytics read-only)
- Feedback endpoint: `POST /api/feedback` (requireAuth) — two emails via Resend; no DB storage

### Session — 2026-03-19 (fifteenth session)

**Tasks completed:**
- Logos updated to `h-28` across all popup/dialog screens; email logo max-height → 112px
- First-login intro popup: only "Let's get started" closes it (no X/outside-click); localStorage key `hasSeenIntro_v2_`
- Tutorial & Guides: accordion toggles, inline step links, floating draggable guide panel on destination pages
- Videos and how-to's reordered to match user journey; numbered; watched detection via YouTube IFrame API

**Architecture notes:**
- How-to data: `client/src/data/howtos.ts`; step type `{ text, link?, linkText? }`
- Floating panel shown when `?back=tutorial&tab=howtos&howto=INDEX` in URL
- Watched videos in localStorage: `reviewoptic_watched_videos`

### Session — 2026-03-20 (sixteenth session)

**Tasks completed:**
- Intro popup video gate — "Let's get started" disabled until video watched to end (YouTube IFrame API state `0`)

**Notes:**
- Set `INTRO_VIDEO_URL` constant at top of `client/src/pages/Dashboard.tsx` when video is ready
- Videos array in `client/src/pages/Tutorial.tsx` still has "Coming soon" placeholders

### Session — 2026-03-22 (seventeenth session)

**Tasks completed:**
- WhatsApp default templates added to registration seed; seeded into all existing accounts via psql
- Brand colours applied — Deep Blue `#0E679D` primary, Light Blue `#64A1C2` secondary, Gold `#DDA636` highlight

**Lessons learned:**
- If exploring themes/layouts, do it on a branch — not main — so reverting is a simple branch switch

---

### Session — 2026-03-22 (eighteenth session)

**Tasks completed:**
- Analytics overhauled — all "reviews received" metrics replaced with "links clicked"; removed Time to Review and Review Platforms charts; renamed `responseRate` → `clickRate`, `reviews` → `clicks`
- ReviewLanding simplified — no internal review submission form; platform buttons only
- Billing page — cancel/reactivate section removed
- Dashboard redesigned — new stat cards layout with greeting
- Add Customer form — "Preferred Channel" field removed
- Add/Edit Customer — email and phone format validation added
- Send Request dialog — channel options disabled based on contact info; custom time picker; template dropdown improvements
- How-to guides updated

**Architecture notes:**
- `POST /api/reviews` endpoint orphaned — ReviewLanding no longer submits reviews; safe to remove
- Analytics `daily` data tracks `clicks` not review submissions

---

### Session — 2026-03-22 (nineteenth session)

**Tasks completed:**
- Dashboard stats fixed — "Requests This Month" counts total review_requests rows; "Awaiting Response" counts pending review_requests
- Analytics fully rewritten to query from `review_requests` table (not `customers`)
- Follow-up Effectiveness chart fixed — uses `follow_up_count > 0` not template_id join
- Best Day to Send chart — based on `clicked_at` day-of-week

**Architecture notes:**
- `baseParams` / `baseWhere` pattern used in analytics for clean filter handling
- `review_requests.clicked_at` stores when link was clicked

---

### Session — 2026-03-23 (twentieth session)

**Tasks completed:**
- Recordings system overhauled — `recordings` DB table, up to 2 per type per account
- New API endpoints for recordings (GET/POST upload/PATCH rename/DELETE)
- Templates → Recordings tab: in-browser recording, record → review → label → save
- Send Request dialogs updated to use recordingId

**Architecture notes:**
- `recordings` table: `id, account_id, type, label, url, elevenlabs_voice_id, created_at`
- Upload fallback: Cloudinary → local disk `/uploads/uuid.webm`

---

### Session — 2026-03-24 (twenty-first session)

**Tasks completed:**
- Star ratings now appear in Recent Activity
- Dashboard Private Feedback — removed duplicate plain-list card

**Fixes:** `.gitignore` malformed — `.env` and `uploads/` were on one line; fixed

---

### Session — 2026-03-24 (twenty-second session)

**Tasks completed:**
- Analytics color theme fix — merged stored colors with Classic defaults on load
- "Negative" color changed from orange to red (`#ef4444`)
- Tutorials updated: recordings how-to rewritten; archive/restore how-to added

---

### Session — 2026-03-24 (twenty-third session)

**Tasks completed:**
- `sendFollowUps()` fully rewritten — handles all 3 follow-up tiers
- 3rd follow-up added; customer status updated correctly through all stages
- `no_response` set automatically when follow-ups exhausted
- Smart template routing: rated-but-not-clicked → `response_positive`; unrated → `follow_up`
- WhatsApp follow-ups added
- Follow-up status badges added to Customers page
- Customer Pipeline chart added to Analytics
- No Response summary card added to Analytics

**Architecture notes:**
- All follow-up delays measured from `firstSentAt` (original send date), not sequentially
- `sentCount` maps: 1=initial, 2=1 follow-up, 3=2 follow-ups, 4=3 follow-ups

---

### Session — 2026-03-24 (twenty-fourth session)

**Tasks completed:**
- Analytics controls bar fixed — `flex-1` inside `overflow-x-auto` anti-pattern resolved
- Summary cards grid updated to `lg:grid-cols-7`

**Fix lesson:** Never put `flex-1` inside `overflow-x-auto` — use two sibling groups with `justify-between`

---

### Session — 2026-03-25 (twenty-fifth session)

**Tasks completed:**
- "After 4–5★ rating, show" option added to Send Request dialogs (Text/Voice/Video)
- Recording ID passed to server; ReviewLanding shows recording after high rating with autoPlay
- Subject line input removed from CustomerDetail send dialog
- Video recorder cancel bug fixed

**Architecture notes:**
- Initial email is always `sendPreScreenEmail`; "Message" in send dialog = content shown AFTER rating on ReviewLanding
- `autoPlay` works because customer has already clicked (user gesture satisfied)

### Session — 2026-03-25 (twenty-sixth session)

**Tasks completed:**
- SMS and WhatsApp review flow unified with email — all three channels now send a single text link; customer taps it → ReviewLanding → selects stars → confirms → next step (low rating = private feedback, high rating = platform links + optional recording)
- Old WhatsApp initial voice/video send removed entirely
- "After 4–5★ rating, show" picker now appears in Send Request dialog for all channels
- WhatsApp "Message type" selector removed from both send dialogs
- Analytics — new "Content Type Performance" chart added
- Tutorials & Guides updated for single-link flow

**Architecture notes:**
- All three channels follow identical flow: initial message with rating link → ReviewLanding → star rating → confirm → next step
- `recording_url` / `recording_type` on `review_requests` set when `recordingId` passed at send time
- `contentTypeData` query groups by `COALESCE(recording_type, 'text')`

### Session — 2026-03-25 (twenty-seventh session)

**Tasks completed:**
- Widget API now queries `review_requests`; widget.js rewritten for grid/carousel layouts
- Content Type Performance chart redesigned as vertical bar chart
- Platform review links fixed (trim + https:// on both frontend and server)
- Dashboard stat cards updated from 3 to 5
- Feature 1: Send New Request button label change
- Feature 2: ReviewLanding click confirmation banner
- Feature 3: Bulk send with checkboxes + floating action bar
- Feature 4: Default send time (Settings → Follow-up tab + send dialogs)
- Feature 5: Dashboard to-do nudge cards
- Feature 7: Star ratings visible in customer list + CustomerDetail

**Architecture notes:**
- `default_send_time` TEXT column in settings (e.g. "10:00")
- Bulk send loops through selected customers via existing POST /api/review-requests
- Widget layout returned from server settings

### Session — 2026-03-25 (twenty-eighth session)

**Tasks completed:**
- Feature 8: Request History — each request shown as journey with chips in CustomerDetail
- Feature 9: Email open tracking — 1×1 GIF pixel, `opened_at` column, public endpoint
- Automated platform review requests at 30/33/37 days since signup
- Follow-up wording fix (gap-based descriptions)
- TimePicker shared component (hour dropdown + :00/:30 toggle + AM/PM)
- Admin customer data cleared
- Dashboard quotes expanded (8→20, randomised per page load)
- Dashboard: quick links row, Ready to Send card, Latest Ratings card
- Settings → Referral tab with shareable link

**Architecture notes:**
- `opened_at TIMESTAMP` on `review_requests` — nullable, set once on first pixel load
- `auto_review_requested_at` + `auto_review_follow_ups` on `users` — daily runner in index.ts
- `TimePicker` at `client/src/components/ui/time-picker.tsx`
- Referral slug derived at render time; no DB column; route `/referral/:slug` not yet built

### Session — 2026-03-26 (twenty-ninth session)

**Tasks completed:**
- Follow-up email/SMS/WhatsApp bugs fixed (3 bugs): rating link in follow-ups, platform buttons for high-rated email, SMS/WA use ReviewLanding links not raw platform URLs
- Templates page redesigned: 5 fixed slots per channel tab (response_positive, response_negative, follow_up_1/2/3)
- Template types renamed: follow_up → follow_up_1/2/3
- RecordingPicker in Templates: select from existing recordings only
- Send Request dialog rewritten: channel, timing, recording picker, template dropdowns
- DB columns added: `positive_template_id` and `negative_template_id` on `review_requests`
- Rating endpoint checks per-request template IDs before falling back to account defaults

### Session — 2026-03-26 (thirtieth session)

**Tasks completed:**
- Response templates display on ReviewLanding pop-up, not sent via email/SMS
- Templates page: subject field replaced with "Opening line" for response templates
- `{{review_link}}` removed from all templates; follow-ups auto-append URL
- Default template bodies set for positive and negative response
- AI generation fixed per template type; hard strip on AI output
- Follow-up send code fixed: all channels auto-append ratingLink

**Architecture notes:**
- `templateOpening` + `templateBody` returned from rating endpoint and displayed in ReviewLanding
- `{{service_type}}` strip: regex removes " and our {{service_type}}" if empty
- Follow-up link = `${appUrl}/review?rid=${newRequestId}` auto-appended after template body
