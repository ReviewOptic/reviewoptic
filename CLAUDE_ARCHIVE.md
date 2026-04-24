# CLAUDE_ARCHIVE.md — Archived Session Logs

Older session logs moved here to keep CLAUDE.md under 30k chars.

---

### Session — 2026-04-08 (fifty-ninth session)

**Tasks completed:**
- **Claira Edwards investigation**: Logs showed her registration POST never hit the server — she loaded the register page at 11:32 PM, then tried to submit during a server restart around 2 AM (SIGTERM). Browser showed Safari's "can't establish a secure connection" error. She was already in the DB from before (now visible via new pending registrations section). Fixed: improved network error message in register form ("Unable to reach the server — please try again").
- **Full delete for admin-managed users**: `DELETE /api/admin/user/:userId` now also removes the user from the admin's own customer list (they were auto-added at registration). Previously left a stale customer record.
- **Resend verification button in admin panel**: Added a blue mail icon button next to each unverified pending user. Calls `/api/auth/resend-verification` — one click to resend without the user having to re-attempt registration.
- **Former subscribers — Customers page**: When a user cancels or deletes, they're now moved (not deleted) in the admin's customer list. Status `"subscriber_cancelled"` (amber badge) for cancellations, `"subscriber_deleted"` (grey badge) for account deletions. Deleted accounts automatically get `do_not_contact = true`; cancelled accounts only if they were `email_unsubscribed`. Both filtered out of the main Customers list and shown in a collapsible "Former subscribers" section at the bottom.
- **Subscriber review request**: New daily job sends a 1–5 star rating email to admin's customers (ReviewOptic subscribers) who joined 30+ days ago and haven't been contacted. Creates a proper `review_request` record so the rating flow works normally. Template (`subscriber_review_request`) is editable via a new "ReviewOptic admin templates" section in the admin panel Emails tab — clearly separated from system emails and dialogue boxes. Test button included.
- **Favicon updated**: Replaced generic orange favicon with the proper ReviewOptic icon. Resized to 256×256 PNG.
- **Privacy Policy section 3 corrected**: Both customer-facing messages and ReviewOptic's own marketing emails now correctly state they include an unsubscribe link for opt-out.

### Session — 2026-04-08 (sixtieth session)

**Tasks completed:**
- **Customer delete is now immediate and permanent**: Changed `deleteCustomer()` to hard-delete immediately. Removed 30-day purge job, `/api/customers/deleted` endpoint, and the Deleted tab.
- **Favicon fixed**: Updated `favicon.png` in `client/public/` to the proper ReviewOptic icon.
- **Privacy Policy section 3 corrected**: Removed incorrect "opt out by contacting us" wording.

### Session — 2026-04-08 (sixty-first session)

**Tasks completed:**
- **Email verification crash fixed**: Added try/catch to verify-email route, server-side retry (800ms), pool error handler, client-side auto-retry (2s).
- **Verification email moved to after payment**: Only sent from `billing/confirm` now.
- **Logo fixed in emails**: Hardcoded to `https://www.reviewoptic.com/logo.png`.
- **30-day free trial copy**: Updated across all pages.
- **Non-www redirect middleware**: Added Express 301 redirect.

### Session — 2026-04-09 (sixty-second session)

**Tasks completed:**
- **Non-www redirect DNS confirmed working**.
- **Referral programme built**: Full implementation — `/referral/:slug`, `referral_rewarded` column, Stripe balance credits, `GET /api/referrals/stats`, Settings Referral tab updated, T&Cs section 21 added.
- **Plan rename + price update**: "Lite" → "Standard" in UI, Pro monthly £49→£39, Pro annual £539→£429.

### Session — 2026-04-09 (sixty-third session)

**Tasks completed:**
- **reviewoptic.com redirect fully live**: Deleted conflicting URL Redirect Record in Namecheap. Added correct A Record and TXT verification records.
- **Checkout loading state added**: Spinner on "Get started"/upgrade buttons.
- **Settings: manual Save button**: Replaced auto-save-while-typing.
- **Admin new user notification**: Emails hello@reviewoptic.com on every new registration.
- **Delete customer confirmation**: Confirmation dialog before delete.

### Session — 2026-04-09 (sixty-fourth session)

**Tasks completed:**
- **Referral reward notification email**: Added `referral_reward` to `DEFAULT_EMAIL_TEMPLATES` with `adminOnly: true`.
- **Login page headline fixed**: Removed "on autopilot" from headline.
- **Login feature cards trimmed**: Cut from 10 to 6.
- **Voice/video copy corrected**: Recordings play on landing page, not embedded in email.

### Session — 2026-04-09 (sixty-fifth session)

**Tasks completed:**
- **FAQ copy accuracy fixes**: Pro annual prices corrected, trial reminder changed from "2 days" to "a few days".

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

### Session — 2026-03-26 (thirty-first session)

**Tasks completed:**
- **Unsubscribe for platform emails**: New `email_unsubscribed` boolean on `users`. `GET /api/unsubscribe/platform?uid=X` sets flag, returns confirmation HTML. Unsubscribed users filtered out of platform review requests and monthly insight emails.
- **Unsubscribe for customer emails**: `GET /api/unsubscribe/customer?cid=X` sets `do_not_contact = true`. Real unsubscribe link in `sendPreScreenEmail` and `sendReviewEmail` footers.
- **Admin panel**: `/api/admin/users` returns `emailUnsubscribed`. Admin Users tab shows orange "Unsub" badge + count.

**Architecture notes:**
- `customerUnsubscribeFooter(customerId)` and `platformUnsubscribeFooter(userId)` helpers in email.ts
- Customer unsubscribe reuses existing `do_not_contact` flag
- Platform unsubscribe NOT added to transactional emails (verification, password reset, cancellation)

### Session — 2026-03-26 (thirty-second session)

**Tasks completed:**
- **Follow-up email subject lines fixed**: Follow-up 1 "Just checking in", Follow-up 2 "A polite reminder", Follow-up 3 "We'd still love to hear from you". `{{business_name}}` removed from all follow-up subjects.

### Session — 2026-03-26 (thirty-third session)

**Tasks completed:**
- **SMS character limit**: 86 chars for follow-up body (160 − short link ~62 − `\nReply STOP` 11). Char counter shows `(max 86)`.
- **Greyed link placeholder** shown below SMS/WA template textarea.
- **SMS opt-out**: `\nReply STOP` appended to all outgoing SMS in `sendReviewSMS`.
- **Short URL `/r/:id`**: Express redirect to `/review?rid=:id`. Used in all SMS sends.
- **Greetings removed** from SMS/WA follow-up templates.
- **Twilio STOP webhook**: `POST /api/webhooks/twilio-inbound` sets `do_not_contact = true` on matching customer. Webhook URL: `https://reviewoptic.com/api/webhooks/twilio-inbound`
- **Test send button** on every template slot. Email → account email. SMS/WA → prompts for phone, sends with `[TEST]`.
- **CSV export** on Customers page.
- **Platform clicks in insight emails** — per-platform click counts section.
- All TS errors fixed.

### Session — 2026-03-26 (thirty-fourth session)

**Tasks completed:**
- **Template reset-defaults bug fixed**: `created_at` column removed from INSERT. Try-catch added.
- **Private feedback auto-refresh**: `refetchInterval: 15000` on dashboard queries.
- **Response template subjects fixed**: `{{business_name}}` removed. New defaults: "Thank you for your rating" / "We'd love to make this right".
- **`{{owner_name}}` merge tag added**: Resolves to first name from Settings. Added everywhere.
- **Email follow-up templates**: New `sendFollowUpEmail` function — sends template body + "Rate your experience →" CTA.
- **Private feedback ignore button**: `PATCH /api/private-feedback/:id/ignore` sets `responded=true`. X button on Dashboard.
- **Canonical defaults enforced** across new account seeding, migrate.ts, and reset-defaults endpoint.

### Session — 2026-03-27 (thirty-fifth session)

**Tasks completed:**
- **Pricing plans**: Standard/Agency → Lite (£29/mo or £319/yr, 10 req/mo) and Pro (£49/mo or £539/yr, unlimited).
- **Lite plan limit**: 403 with `code: "lite_limit_reached"` and `resetDate`. Frontend shows dialog.
- **14-day free trial**: Added to Stripe checkout for new subscribers only. Billing tab shows trial end date.
- **Register page rebuilt**: Standalone clean page, T&C checkbox. After registration → `/pricing`.
- **FAQ page**: `/faq` with 5 sections, 22 questions.
- **Cancelled plan behaviour**: Can browse full app — only `POST /api/review-requests` blocked.
- **Account deletion**: `DELETE /api/account` sets `scheduled_for_deletion_at = NOW() + 30 days`. Daily runner hard-deletes past window.
- **T&Cs/Privacy/Features pages updated**.
- **`schema_migrations` table + `once()` helper**: One-time UPDATE blocks gated — user customisations survive restarts.
- **ReviewLanding low-rating footnote**: "This doesn't affect your right to leave a public review."

---

### Session — 2026-03-28 (thirty-sixth session)

**Tasks completed:**
- **Two-track follow-up system finalised**: Unrated customers get 3 generic nudges encouraging them to click a star. Customers who rated 4–5★ but haven't clicked a platform link get personalised Follow-up 1/2/3 templates. 1–3★ customers never followed up.
- **WhatsApp opt-out text added**: Initial WhatsApp sends and follow-up WhatsApp sends now append `\nReply STOP to opt out.` Twilio inbound webhook strips `whatsapp:` prefix to handle STOP replies for both SMS and WhatsApp.
- **Critical DNC bug fixed**: `POST /api/review-requests` now checks `customer.doNotContact` before sending — returns 400 if true.
- **Trial reminder email**: New `trial_ends_at` and `trial_reminder_sent` columns on users.
- **Subscription-ended email**: Stripe `customer.subscription.deleted` webhook sends `sendSubscriptionEndedEmail`.
- **T&Cs acceptance recorded**: New `terms_accepted_at` column. Register route validates `termsAccepted: true`.
- **Session cookie security**: `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"` added.
- **Rate limiting**: `express-rate-limit` — 20 req/15min on auth routes.
- **Helmet security headers**: Added with CSP and COOP disabled (required for Stripe embedded checkout).
- **Cookie consent banner**: `CookieConsent.tsx` — localStorage `ro_cookie_consent`.
- **Onboarding checklist**: `OnboardingChecklist.tsx` — 4 steps for new owners.
- **Sentry error monitoring**: `@sentry/node` — captures 500 errors. `SENTRY_DSN` env var.
- **Resend domain verified**: `reviewoptic.com` confirmed Verified.
- **use-page-meta hook created**: Ready for SEO meta tags.

---

### Session — 2026-03-28 (thirty-seventh session)

**Tasks completed:**
- **Subscription confirmation email**: `sendSubscriptionConfirmationEmail` fires on `invoice.payment_succeeded`. `subscription_confirmation_sent` DB flag prevents double-sends.
- **Trial reminder runner removed**: Removed from index.ts and email.ts.
- **All platform emails rewritten** for warm/friendly tone (verification, team invite, cancellation, subscription-ended, subscription confirmation).
- **Sign-off**: "Alicia & Rob — ReviewOptic" on all emails.

**Architecture notes:**
- Stripe webhook handles: `customer.subscription.deleted` (cancellation email) + `invoice.payment_succeeded` (confirmation email)

---

### Session — 2026-03-28 (thirty-eighth session)

**Tasks completed:**
- **Privacy Policy DPA notes completed**: Full GDPR language for all 5 processors (Resend, Stripe, Neon, Twilio, Sentry).
- **Privacy Policy logo removed**.
- **Terms & Conditions logo resized**: `h-28`.

---

### Session — 2026-03-29 (thirty-ninth session)

**Tasks completed:**
- **Checkout 401 — session save**: Added explicit `await req.session.save()` to login and verify-email routes.
- **Checkout 401 — requiresVerification flow**: `AuthContext.register()` no longer calls `setUser()` for requiresVerification responses.
- **Billing confirm crashing — missing DB columns**: Ran ALTER TABLE for `trial_ends_at`, `trial_reminder_sent`, `subscription_confirmation_sent`.
- **Billing confirm auth-free**: Removed `requireAuth` — security relies on Stripe `session_id`.
- **Session debug logging**: `requireAuth` logs session info on 401.
- **BillingSuccess shows real error message**.

**Architecture notes:**
- Billing confirm is auth-free — `userId` comes from Stripe-stored metadata, not client input.

---

### Session — 2026-03-29 (fortieth session)

**Tasks completed:**
- **Checkout confirmed working** — clean end-to-end test passed.
- **Intro video modal disabled** — commented out in Dashboard.tsx; uncomment + add `INTRO_VIDEO_URL` to re-enable.
- **Login page copy updated** — tagline, platform list, 4 new feature cards (voice/video, revenue stat, service recovery, social auto-posting).
- **Features page**: logo enlarged, Voice & Video category added, Standard plan label.
- **Pricing page**: both Get Started buttons blue.
- **FAQ**: service recovery reframe, billing cycle reset, Zapier import note, CTA banner.
- **Lite plan renamed to Standard** everywhere (display labels only; DB value `"lite"` unchanged).
- **Confirm email field added to Register page**.

### Session — 2026-03-30 (forty-first session)

**Tasks completed:**
- Cancel subscription — modal dialog (password-confirmed pop-up modal)
- Delete account — two-step modal flow with bcrypt password verification
- Delete account — confirmation email with 30-day purge date and reactivation link
- Cancellation and subscription-ended emails updated with billing period end date
- Access enforcement: cancelled accounts blocked from adding customers
- Admin panel — Cancelled tab and Deleted tab added with CSV export
- 4–5★ template default text updated
- Cancel/delete buttons on same row in Billing page

### Session — 2026-03-30 (forty-second session)

**Tasks completed:**
- Deletion email reactivation link added (`reactivateUrl` param → `/pricing`)
- Reactivation clears `scheduled_for_deletion_at` flag via `billing/confirm`
- Cancellation email flow confirmed correct (2 emails: immediate + end-of-period)

### Session — 2026-03-30 (forty-third session)

**Tasks completed:**
- Analytics active state colours use `useChartColors()` (not hardcoded)
- Analytics "All time" filter added (`days=all`)
- Customers mobile scroll fixed (status badge column hidden on mobile)
- Templates tab restructured: 5 tabs — Ratings | Email | SMS | WhatsApp | Recordings
- Email templates: no character limit shown
- Recordings: Upload file button added; iOS Safari MIME type fix

### Session — 2026-03-30 (forty-fourth session)

**Tasks completed:**
- PWA / Add to Home Screen setup (`manifest.json`, apple-touch-icon, square icon)
- Tutorials: How-to and Top Tips entries for mobile app install
- Features page: Mobile & Access category
- Full mobile audit: Register, Settings, Dashboard, Billing, Layout all fixed

### Session — 2026-03-30 (forty-fifth session)

**Tasks completed:**
- Dashboard stat card hover performance fix (`transition-[filter]`)
- Settings page width fix (`max-w-5xl`)
- Business logo shown in Dashboard header
- Admin account (hello@reviewoptic.com) made undeletable server-side
- All test accounts deleted; admin excluded from Users list
- Soft-delete for customers (`deleted_at` column, 30-day purge cron)
- Deleted customers view with Reactivate button
- Instagram auto-posting removed entirely
- App font changed to Lexend

### Session — 2026-03-30 (forty-sixth session)

**Tasks completed:**
- Settings tab navigation fixed (controlled component, URL sync)
- Settings broken link fixed (`/templates` not `/?tab=templates`)
- Customers URL filter synced to URL params
- Admin metrics reset (clean DB for real users)

### Session — 2026-04-03 (forty-seventh session)

**Tasks completed:**
- **SMS updated to send from Twilio phone number**: `sendReviewSMS` and `sendPlainSMS` now use `TWILIO_PHONE_NUMBER` env var instead of alphanumeric sender ID. Enables inbound STOP replies via webhook.
- **Inbound STOP webhook confirmed**: `/api/webhooks/twilio-inbound` already built and correct. Configured in Twilio console on +447863750348.
- **Production build updated**: Rebuilt `dist/index.cjs` to pick up all code changes.
- **Twilio account upgraded**: Purchased UK mobile number +447863750348, assigned regulatory bundle.
- **Meta Business Verification submitted**: Awaiting email confirmation.
- **WhatsApp Business setup started**: Blocked by Meta requiring business verification first.

**Architecture notes:**
- Replit runs production mode (`npm start` → `dist/index.cjs`). Must run `npm run build` after code changes.

### Session — 2026-04-03 (forty-eighth session)

**Tasks completed:**
- **SMS sender switched to alphanumeric "ReviewOptic"**: UK mobile number cannot send A2P SMS. Hardcoded `"ReviewOptic"` in `sms.ts`.
- **SMS opt-out: unsubscribe link**: `Stop: reviewoptic.com/u/TOKEN` (8-char prefix of UUID). `GET /u/:token` marks Do Not Contact, returns HTML confirmation.
- **Twilio alphanumeric sender ID registration submitted**: Awaiting approval. Once approved: set `SMS_ENABLED=true`.
- **Stripe promo codes enabled**: `allow_promotion_codes: true` in checkout session.
- **Coming soon badges**: `GET /api/features` reads `SMS_ENABLED`, `WHATSAPP_ENABLED`, `SOCIAL_ENABLED` env vars. `useFeatures()` hook removes badges when vars are set.
- **Terms & Privacy completed**: ReviewOptic Limited, company number 17134444, hello@reviewoptic.com.
- **Beta tester discount**: `BETAFREE` promo code live at checkout.

**Architecture notes:**
- Feature flags: `SMS_ENABLED`, `WHATSAPP_ENABLED`, `SOCIAL_ENABLED` → `/api/features` → `useFeatures()` hook.
- To grant complimentary access: `UPDATE users SET plan_type = 'complimentary' WHERE email = 'x@x.com';`

### Session — 2026-04-03 (forty-ninth session)

**Tasks completed:**
- **Push notifications (PWA)**: VAPID keys in Replit. SW at `client/public/sw.js`. Bell icon with unread badge + dropdown. Polls every 30s. DB: `notifications` + `push_subscriptions`.
- **Rating notifications**: Star rating fires (1) in-app bell, (2) lock-screen push, (3) instant email to owner.
- **Settings → Notifications tab**: Toggle "Email me when a rating is received" → `settings.notify_ratings`.
- **Instagram auto-posting**: Generates 1080×1080 PNG (sharp + SVG) → Cloudinary → Facebook photo post → Instagram via Graph API.
- **Social tab logos**: `react-icons` (FaFacebook, FaInstagram, FaLinkedin).

**Architecture notes:**
- `sendPushToAccount(accountId, payload)` in routes.ts. Dead subscriptions (410/404) auto-deleted.
- `server/reviewCard.ts` → `generateReviewCard(stars, name, businessName)` → Buffer.
- `instagramBusinessAccountId` fetched via `/{page-id}?fields=instagram_business_account`. Cleared on Facebook disconnect.
- Meta App Review needed for real users: `pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`, `instagram_business_basic`.

### Session — 2026-04-03 (fiftieth session)

**Tasks completed:**
- **Trial period extended to 30 days**: `trial_period_days` 14 → 30 in `server/routes.ts:2818`.

### Session — 2026-04-03 (fifty-first session)

**Tasks completed:**
- **Domain setup guidance**: Namecheap A record (34.111.179.208) + TXT + www CNAME → review-optic.replit.app.

### Session — 2026-04-03 (fifty-second session)

**Tasks completed:**
- **Domain connected**: `reviewoptic.com` verified in Replit. Removed conflicting URL Redirect record.
- **Admin account fixed**: Used temp endpoint to set `is_admin = true, plan_type = 'complimentary'` for `hello@reviewoptic.com`.
- **Migration fixed**: Changed FK type from UUID → TEXT to fix type mismatch crash.
- **Notifications bug fixed**: Changed `req.user.accountId` → `req.session.accountId`.
- **SMS working**: Swapped to live Twilio credentials. SMS sends from "ReviewOptic".
- **Show/hide password button**: Eye icon toggle on login/register.
- **Stripe live mode**: Webhook at `https://reviewoptic.com/api/billing/webhook` registered. `STRIPE_WEBHOOK_SECRET` set.
- **Facebook reconnected**: OAuth redirect URI updated to `https://reviewoptic.com/api/auth/facebook/callback`.
- **Meta App Review submitted**: Waiting on Business Verification.
- **APP_URL set**: `APP_URL=https://reviewoptic.com`.

**Architecture notes:**
- `ADMIN_EMAIL=hello@reviewoptic.com` → migration auto-sets `is_admin = true, plan_type = 'complimentary'` on startup.
- Live DB is separate. Use temp endpoints for one-off live DB operations.
### Session — 2026-04-04 (fifty-third session)

**Tasks completed:**
- **Admin email panel — system emails**: Audited all system email types. Removed `review_request` and `follow_up` from admin panel (user-customizable per-account via Templates page, not system-level). All remaining emails go to the ReviewOptic subscriber (user), plus `pre_screen` which goes to their customers.
- **Admin email panel — post-rating dialogue boxes**: Added `dialog_positive` (4–5★) and `dialog_negative` (1–3★) to the `system_email_templates` DB table and admin panel. Stored in same table with types `dialog_positive` / `dialog_negative`. Admin can edit title and body text. No Test button (they're not emails).
- **Admin emails tab split into two sections**: "System emails" (with Edit + Test buttons) and "Post-rating dialogue boxes" (Edit button only). Edit modal correctly labels field as "Title" not "Subject" for dialogue types, and description says "changes apply to all customers" not "all future emails".
- **Public dialog-text endpoint**: `GET /api/public/dialog-text` returns effective dialogue text (DB override or default) for both types. No auth required.
- **ReviewLanding.tsx updated**: Fetches `/api/public/dialog-text` on load. Uses system defaults as fallback when per-account templateBody/templateOpening are empty. The "This doesn't affect your right to leave a public review." line remains hardcoded and non-editable.
- **Confirmed existing behaviour**: 4–5★ dialogue shows platform cards (Google, Facebook, etc.) with logos when user has review links set in Settings. These are fully clickable and open the platform URL.

**Architecture notes:**
- `dialog_positive` / `dialog_negative` stored in `system_email_templates` table (same as email overrides). `subject` field = dialogue title, `body` field = dialogue body text.
- Admin template changes are global — affect all users/customers immediately.
- ReviewLanding fetches dialog-text once on load with 1-hour stale time.
- Per-account template text (user's custom review template) still takes precedence over system defaults for the negative dialog body.

**Waiting on (external — unchanged):**
- **⚠️ Meta Business Verification** — email from Meta pending. Once approved: App Review will process → set `SOCIAL_ENABLED=true`.
- **⚠️ Meta App Review** — submitted, waiting on Business Verification first.
- **⚠️ WhatsApp** — needs Meta Business Verification → complete Twilio WhatsApp sender setup → set `TWILIO_WHATSAPP_FROM` + `WHATSAPP_ENABLED=true`. Then update Google Business description to mention WhatsApp.

**Notes for next session:**
- **Referral programme** — still pending, pure code work
- **WhatsApp** — once Meta approved, update Google Business description: "email, SMS or WhatsApp"

### Session — 2026-04-04 (fifty-fourth session)

**Tasks completed:**
- **Full SEO setup**: Keywords researched and applied. Primary: "review request software". Secondary: automated review requests, get more Google reviews, review collection software, customer review automation.
- **client/index.html**: keyword-optimized title (57 chars), meta description (148 chars), canonical URL, full OG tags (og:url added, og:image points to existing /logo.png), full Twitter card tags.
- **landing.html**: Added complete meta/OG/Twitter tags. H2s updated to include keywords ("Three steps to more Google reviews", "Automated review request software, built for small business"). Copied to client/public/ → builds to /landing.html.
- **robots.txt**: Created — allows all crawlers, disallows /api/ + /uploads/, points to sitemap.
- **sitemap.xml**: All public pages with priority weights (/ = 1.0, /features + /pricing = 0.8, /faq = 0.7, /register = 0.6, /login = 0.4, /privacy + /terms = 0.3).
- **use-page-meta.ts**: Enhanced to update OG tags, Twitter tags, og:url, and canonical link on every route change.
- **Pricing, Features, FAQ**: All wired up with page-specific titles, descriptions, and canonical paths.

**Architecture notes:**
- OG image uses `/logo.png`. For best social sharing, create a 1200×630px `/og-image.png` and update the `og:image` tags in index.html and landing.html.
- landing.html serves at `/landing.html` (not `/`). For best SEO, consider a server route for unauthenticated `GET /` → serve landing.html directly.
- Submit sitemap to Google Search Console: Sitemaps → enter `sitemap.xml` → Submit.

**Notes for next session:**
- **Referral programme** — still pending, pure code work
- **Google Search Console** — submit sitemap and verify domain ownership
- **OG image** — create a 1200×630px branded image and save as client/public/og-image.png

### Session — 2026-04-04 (fifty-fifth session)

**Tasks completed:**
- **All SEO URLs fixed to www**: Discovered live domain is `www.reviewoptic.com` (non-www doesn't work). Updated canonical, og:url, og:image, sitemap, and BASE_URL in use-page-meta.ts from `reviewoptic.com` → `www.reviewoptic.com`.
- **Google Search Console**: Property verified at `https://www.reviewoptic.com`. Sitemap submitted (`sitemap.xml`, 8 pages discovered). Homepage indexing requested.
- **Bing Webmaster Tools**: Verified via HTML meta tag (`msvalidate.01`). Sitemap submitted and processing.
- **SaaSHub**: Free listing submitted with competitors listed (Trustpilot, Birdeye, Podium, Grade.us, NiceJob) — will show as alternative in search results.
- **AlternativeTo**: Free listing submitted.
- **BetaList**: Skipped — no free tier, minimum $39.

**Architecture notes:**
- Canonical domain is `https://www.reviewoptic.com` — always use www in all future URLs, links, and configs.
- Google + Bing verification meta tags are in `client/index.html`.

**Waiting on (external — unchanged):**
- **⚠️ Meta Business Verification** — IN01 document submitted. Domain verified via meta tag. Awaiting approval.
- **⚠️ Meta App Review** — submitted, waiting on Business Verification first.
- **⚠️ WhatsApp** — needs Meta Business Verification first.

**Notes for next session:**
- **Referral programme** — still pending, pure code work
- **OG image** — create a 1200×630px branded image, save as `client/public/og-image.png`, update `og:image` in `client/index.html` and `landing.html`
- **Product Hunt / Hacker News** — save for when there's traction to show

### Session — 2026-04-05 (fifty-sixth session)

**Tasks completed:**

- **Admin panel mobile responsiveness**: Fixed header overflow (flex-col on mobile), tabs now show as 3+2 grid with labels on mobile (Users/Cancelled/Deleted top row, Metrics/Emails bottom row centred), cancelled accounts table hides non-essential columns on mobile, users table hides Custs/Reqs/Last Active/Role on small screens. No scrollbars.
- **Free trial copy audit**: Confirmed 14 days correct everywhere. Fixed one outlier: Pricing page meta description said "30-day free trial" → corrected to 14 days.
- **Pricing audit**: £29/month Standard, £49/month Pro correct everywhere. Annual £319/£539 maths correct.
- **Messaging audit — "automates requests" fix**: Corrected all instances implying ReviewOptic automatically sends the initial request. Now consistently says "you send review requests, ReviewOptic follows up on autopilot". Fixed in: `use-page-meta.ts`, `Pricing.tsx`, `FAQ.tsx`, `landing.html` (meta, H1, hero body, step 2 heading/copy), `Settings.tsx` (all 4 referral share messages).
- **FAQ typo fixed**: "and and automatically" → corrected.
- **Terms & Conditions**: Removed "registered office at hello@reviewoptic.com" (email is not an address; home address privacy). Replaced with "You can contact us at hello@reviewoptic.com." Section 15 survival clause corrected: was listing section 15 itself and missing section 14 (Limitation of liability) → fixed to sections 9, 10, 11, 12, 13, 14.
- **Privacy Policy**: Added WhatsApp to section 3. Added voice/video recordings to section 2 (data collected). Added OpenAI and ElevenLabs as data processors in section 5 (legally required under UK GDPR).
- **Social media consistency**: Features page SOCIAL_ITEMS set was mismatched (wouldn't show "coming soon" badge when social disabled) → fixed. Login page said "Facebook and LinkedIn" → updated to "Facebook, Instagram & LinkedIn" to match Features page.
- **Meta domain verification**: Added `<meta name="facebook-domain-verification" content="yomb587husc1goq2qbzo8s23cno2lp" />` to `client/index.html`. Verified successfully.
- **index.html meta descriptions**: Were still saying "automates review requests" (missed when updating `use-page-meta.ts`) → corrected to match new messaging.

**Architecture notes:**
- Privacy Policy now correctly lists all data processors: Resend, Stripe, Neon, Twilio, Sentry, OpenAI, ElevenLabs, Meta, LinkedIn.
- DPAs with OpenAI and ElevenLabs are accepted as part of their standard API sign-up terms — worth confirming this is documented.

**Waiting on (external):**
- Meta Business Verification (IN01 submitted) → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral programme** — still the top pending code task
- **Once Meta Business Verification approved** → Meta App Review will process → then:
  - Set `SOCIAL_ENABLED=true` (unlocks Facebook/Instagram auto-posting)
  - Complete Twilio WhatsApp sender setup → set `TWILIO_WHATSAPP_FROM` + `WHATSAPP_ENABLED=true`
  - Update Google Business description to mention WhatsApp
  - Test Instagram auto-posting end to end

### Session — 2026-04-06 (fifty-seventh session)

**Tasks completed:**
- **Payment failure handling**: Suspend on first failure, auto-retry x2 (Stripe), auto-cancel after all retries exhausted. `payment_failed` + `payment_failed_at` + `payment_failed_count` columns added to users table.
- **Payment failed email**: Sent on each failure, escalating urgency on 2nd attempt. Includes "Retry payment" and "Update card" links.
- **Renewal reminder email**: Fired via `invoice.upcoming` webhook (3 days before renewal). Branded, links to /billing.
- **Retry payment button**: In Billing page — immediately charges existing card via `POST /api/billing/retry-payment`. Clears suspension on success.
- **Payment failed banner**: Red banner in Layout when `paymentFailed = true`. Links to Billing.
- **Data export**: `GET /api/account/export` returns JSON of all account data (customers, requests, feedback). "Export my data" button in Billing. GDPR portable format.
- **Admin manual suspension**: `is_suspended` column, toggle endpoint, Ban icon button in admin user rows (orange when suspended). Full-screen lockout page shown to suspended users.
- **T&Cs full overhaul**: Now 23 sections. Added indemnification (s16), third-party services (s17), force majeure (s18), severability (s19), promotions clause (s20). Fixed billing copy, termination copy, warranty heading, plan names. Cross-referenced against actual app behaviour.
- **Privacy Policy full overhaul**: Now 17 sections. Added international transfers (s11), third-party links (s11→moved), business sale (s12), change of purpose (s13), data breaches (s15). Added AI chat messages, billing data to s2. Added all email types to s3 (insight reports, rating notifications, platform review emails). 1-month rights response time added. Tightened customer data liability.
- **Both documents**: Mobile optimised (responsive padding/headings/logo), Privacy Policy logo added, last updated date corrected to 6 April 2026.
- **Stripe webhooks**: Added `invoice.upcoming` and `invoice.payment_failed`. Configured retry schedule (2x at 1 day apart), cancel subscription + mark invoice uncollectible on failure, Stripe customer emails turned off (we handle our own), all customer portal links point to /billing.

**Architecture notes:**
- Payment failure flow: `invoice.payment_failed` → set `payment_failed=true`, increment `payment_failed_count`, send email. `invoice.paid` → clear all flags. Daily job cancels if `payment_failed_count >= 2`.
- Stripe handles card expiry emails (more reliable for modern PaymentMethod cards than our own webhook).
- `customer.source.expiring` webhook NOT handled — Stripe's built-in email used instead, pointing to /billing.
- Data export is unauthenticated-safe: uses `requireAuth` + `accountId` from session.
- Suspension is a full lockout (403 on all API calls + full-screen UI). Different from cancelled (read-only).

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral programme** — still the top pending code task


### Session — 2026-04-07 (fifty-eighth session)

**Tasks completed:**
- **Stripe payment page fixed**: New users couldn't subscribe — `APP_URL=www.reviewoptic.com` (missing `https://`) caused Stripe to reject the `return_url` with `StripeInvalidRequestError url_invalid`. Fixed by normalising `APP_URL` at server startup in `server/index.ts`: if it doesn't start with `http`, prepend `https://`.
- **Register page logo fixed**: Logo PNG has a solid white background. The previous `brightness-0 invert` CSS filter made it entirely white → invisible on the blue header. Fixed by wrapping the image in a white rounded container (`bg-white rounded-xl px-4 py-2`).
- **Apple Pay / Google Pay enabled**: Removed `payment_method_types: ["card"]` from Stripe checkout session creation in `server/routes.ts`. Stripe now auto-detects supported payment methods per device — Apple Pay shows on Safari/iOS, Google Pay on Android/Chrome.
- **Pending registrations visible in admin panel**: Admin panel was filtering to `emailVerified && plan !== "free"` — so unverified/unpaid users were completely invisible. Added `GET /api/admin/pending-users` endpoint and a "Pending registrations" section in the admin Users tab showing name, email, sign-up date, and a delete button.
- **Auto-delete unverified accounts after 5 days**: Daily cleanup job in `server/index.ts` deletes users where `email_verified = false` and `created_at < NOW() - 5 days`. Also removes them from the admin's customer list.
- **"Did you mean to sign up?" email**: Before deleting each unverified account, the cleanup job sends a friendly re-registration email. Subject: "Did you mean to sign up for ReviewOptic?" Body explains their account was removed, includes a "Complete my sign-up" CTA button linking to `/register`, and invites them to reply with questions. Function: `sendIncompleteRegistrationEmail` in `server/email.ts`.

**Bug/issue discovered:**
- User "Claira Edwards" couldn't be found anywhere in the admin panel — she had registered but never verified or paid, so was hidden. She is not in the production DB (likely registered on a local/staging run). She should simply register fresh — payment will now work with today's fixes.

**Architecture notes:**
- `APP_URL` normalisation happens at the very top of server startup, before any Stripe calls. All existing code that uses `process.env.APP_URL` is unaffected.
- Pending users endpoint: `GET /api/admin/pending-users` — returns users with `email_verified = false OR plan_type = 'free'`, newest first.
- Cleanup job also removes from admin's customer list (added automatically at registration) to keep things tidy.
- Email sent fire-and-forget (`.catch` logged) — deletion proceeds even if email fails.

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral programme** — still the top pending code task
