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

*(Sessions 18–58 archived to CLAUDE_ARCHIVE.md)*

### Session — 2026-04-24 (sixty-ninth session)

**Tasks completed:**
- **Facebook "New Page Experience" connect fixed**: Root cause — Facebook API v15+ no longer returns "New Page Experience" pages via `/me/accounts`, even with all permissions granted (`pages_show_list`, `pages_manage_posts`, `pages_read_engagement` all confirmed granted). Fixed with a 3-step fallback chain in the callback:
  1. Try `debug_token` granular_scopes to extract the page ID Facebook actually authorized (works silently, no user input)
  2. Try previously stored `facebookPageId` for silent reconnect
  3. Last resort: redirect to Settings → Social with inline page URL input
- **Facebook OAuth redirect fixed**: Was redirecting to `/?tab=settings` (Dashboard) instead of `/settings?tab=social`. Fixed all OAuth redirects (Facebook, LinkedIn, fbmanual) to use `/settings?tab=social`.
- **Instagram auto-connect fixed**: Manual page connection flow was fetching `instagram_business_account` using the user token instead of the page token — returned nothing even when IG was linked. Fixed to use page token for the IG lookup.
- **Instagram messaging updated**: Now clearly explains that Instagram posting requires a Facebook Page connection (Meta's API requirement, not our limitation). If FB connected but no IG found, shows a direct link to Facebook's help page for linking IG to a Page.
- **LinkedIn OAuth fixed**: Was requesting `r_organization_social` scope (requires LinkedIn Marketing Developer Platform — formal review). Changed to `openid profile w_member_social`. Also added "Sign In with LinkedIn using OpenID Connect" product to LinkedIn app. Posts now as the member's personal profile instead of a company page. Callback uses `/v2/userinfo` (OpenID) to get person ID.
- **LinkedIn redirect URI fixed**: Added `https://www.reviewoptic.com/auth/linkedin/callback` to LinkedIn Developer Portal. Kept localhost URL alongside it.
- **Settings page inline FB connect**: When manual URL entry is needed (last resort), user now sees a clean inline input in the Settings Social tab — no more raw HTML form page.

**Architecture notes:**
- Facebook page token flow: `debug_token?input_token={user_token}&access_token={app_id}|{app_secret}` returns `granular_scopes` with `target_ids` — these are the page IDs the user actually authorized. We iterate them and call `/{page_id}?fields=access_token,instagram_business_account` with the user token to get the page token.
- LinkedIn: posts as `urn:li:person:{sub}` where `sub` comes from `/v2/userinfo`. Person ID stored in `linkedinOrganizationId` field (field name is legacy, value is now person ID).
- LinkedIn tokens expire after 60 days — user will need to reconnect periodically. No expiry notification shown proactively; only show a dialog when token is actually expired (not yet implemented).

**Pending:**
- **Switch Facebook app to Live mode**: Still in Development mode in Meta Developer Portal → your app. Until switched to Live, only the app admin (you) can connect Facebook. Other users cannot connect.
- **Test WhatsApp sending**: Still untested — send a test request from a customer detail page.
- **Test Facebook/Instagram posting**: Connect both and trigger a 4/5-star review to confirm a card posts to both.
- **Test LinkedIn posting**: Confirm a review card posts to your personal LinkedIn profile after connecting.

### Session — 2026-04-24 (sixty-eighth session)

**Tasks completed:**
- **Facebook OAuth redirect URI fixed**: Added `https://www.reviewoptic.com/auth/facebook/callback` to the Valid OAuth Redirect URIs in Meta Developer Portal. The connect flow now gets past the redirect error.
- **Facebook debugging improved**: The callback now logs the raw token and pages API responses to the server console, and shows the actual Facebook API error in the browser instead of a generic message. This will make diagnosing the next issue much easier.
- **Stale Facebook auth identified**: Facebook was reusing a previously cached authorization with incomplete permissions, causing "No Facebook Pages found." Fix: user needs to go to facebook.com → Settings → Apps and Websites → remove ReviewOptic, then reconnect fresh.

**Notes for next session:**
- **Complete Facebook connect**: User needs to remove ReviewOptic from their Facebook Apps and Websites settings first, then retry connecting from Settings → Social. The improved error message will now show the actual API response if it fails again.
- **Switch Facebook app to Live mode**: Still needs to be done in Meta Developer Portal → your app → Development → Live. Until this is done, only the app admin can connect.
- **Test WhatsApp sending**: Not yet tested — send a test request from a customer detail page and confirm it arrives.
- No other pending code tasks.

### Session — 2026-04-24 (sixty-seventh session)

**Tasks completed:**
- **No code changes** — this was a configuration and discovery session.
- **Meta Business Verification confirmed**: Meta finally approved business verification, unblocking Facebook/Instagram and the WhatsApp path.
- **FB/IG autoposting audited**: Feature is fully code-complete. Credentials (`FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`) were already set. Feature was hidden because `SOCIAL_ENABLED` env var was not set.
- **WhatsApp sending audited**: Feature is fully code-complete and runs through Twilio (not Meta's direct API). Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`) were already set. Feature was hidden because `WHATSAPP_ENABLED` env var was not set.
- **`APP_URL` fixed**: Was set to `reviewoptic.com` (missing `https://`), which would have broken the Facebook OAuth redirect. Corrected to `https://www.reviewoptic.com` in Replit Secrets.
- **Feature flags enabled**: Added `SOCIAL_ENABLED=true` and `WHATSAPP_ENABLED=true` to Replit Secrets. App redeployed.

**Notes for next session:**
- **Test Facebook connect flow**: Go to Settings → Social and connect a Facebook page. Confirm it links the Instagram account too. Then trigger a review and check it posts to both.
- **Switch Facebook app to Live mode**: In Meta Developer Portal → your app → switch from Development to Live. In Development mode only app admins can connect their Facebook account. Also confirm `https://www.reviewoptic.com/auth/facebook/callback` is listed under Facebook Login → Valid OAuth Redirect URIs.
- **Test WhatsApp sending**: Send a test review request via WhatsApp from the customer detail page and confirm it arrives.
- WhatsApp runs through Twilio — Meta App Review is not required for this to work.
- No pending code tasks.

### Session — 2026-04-16 (sixty-sixth session)

**Tasks completed:**
- **Settings page crash fixed**: `formRef = useRef(form)` was declared on line 44 before `form` was declared on line 81 — JavaScript temporal dead zone threw a ReferenceError, caught by ErrorBoundary, showing "Something went wrong." Fixed by moving `formRef` to after the `form` useState declaration.
- **Security vulnerabilities fixed** (required to unblock Replit deployment):
  - `server/elevenlabs.ts`: replaced `execSync` with string interpolation → `execFileSync` with args arrays (command injection fix)
  - `server/routes.ts`: rewrote SMS STOP handler to use `ANY($1::text[])` array parameter instead of dynamic placeholder construction
  - `client/public/widget.js`: fully rewrote using `createElement`/`appendChild`/`textContent` — no `innerHTML` anywhere
  - `server/email.ts`: removed all customer/user email addresses from `console.log` statements (GDPR/PII compliance)
- **Dependency updates**: all packages patched (axios, drizzle-orm, lodash, minimatch, vite, rollup etc.), npm overrides added to force patched versions for transitive deps
- **Replit scanner deadlock**: scanner was stuck scanning old deployed version and blocking new deploy. Replit support manually cleared it.

**Notes for next session:**
- No pending code tasks
- All copy, pricing, and security issues resolved

### Session — 2026-04-09 (sixty-fifth session)

**Tasks completed:**
- **FAQ copy accuracy fixes**: Pro annual prices were stale from last session's reprice — corrected £539→£429 and £588→£468. Trial reminder changed from "2 days" to "a few days" (Stripe fires invoice.upcoming 3 days before, not 2).
- **FAQ and Pricing page audited**: No other inaccuracies found. Pricing meta description ("follow-ups handled on autopilot") is correctly specific. All pricing, feature descriptions, and process descriptions checked as accurate.

**Notes for next session:**
- All copy and pricing is now accurate and up to date
- No pending code tasks
- Waiting on Meta/WhatsApp externally as before

### Session — 2026-04-09 (sixty-fourth session)

**Tasks completed:**
- **Referral reward notification email added to admin templates**: `referral_reward` added to `DEFAULT_EMAIL_TEMPLATES` with `adminOnly: true` — appears in Admin → Emails → ReviewOptic admin templates. Subject/body now editable. Variables: `{{first_name}}`, `{{credit_amount}}`. `sendReferralRewardEmail` updated to use the template system via `getEffectiveTemplate`.
- **Login page headline fixed**: Removed "on autopilot" from headline (only follow-ups are automated, not initial requests). New subheading: "Send review requests in seconds. ReviewOptic follows up automatically — so no opportunity is ever missed."
- **Login feature cards trimmed**: Cut from 10 to 6 — kept highest-impact items (Every review grows your business, Send in seconds, Automatic follow-ups, Personal voice & video, Turn unhappy customers, AI insights).
- **Voice/video copy corrected**: Was incorrectly saying recordings are "embedded in email" — they actually play on the review landing page when the customer clicks the link. Fixed in both Login.tsx and Features.tsx. Also removed inaccurate "record once, reuse" claim.

**Architecture notes:**
- Voice/video recordings: stored in Cloudinary, URL saved on the `review_requests` record. Played on the `/review/:id` landing page (ReviewLanding.tsx), NOT embedded in emails. The email just contains the link — the recording plays when the customer opens that link.
- Referral reward email: uses `getEffectiveTemplate("referral_reward")` so subject/body are DB-overridable from admin panel.

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- No major pending code tasks
- Consider auditing FAQ and Pricing page copy for similar accuracy issues now that Login/Features have been cleaned up

### Session — 2026-04-09 (sixty-third session)

**Tasks completed:**
- **reviewoptic.com redirect now fully live**: Root cause was a URL Redirect Record in Namecheap conflicting with the A Record — Namecheap was trying to do the redirect itself but dropping the connection. Fixed by deleting the URL Redirect Record. Also added the correct A Record (34.111.179.208) and two TXT verification records (@ and www) for Replit domain verification. Domain now routes correctly through Express middleware to https://www.reviewoptic.com.
- **Checkout "Lite Plan" label fixed**: The dist already had "Standard Plan" — was a cached Stripe product name from old sessions. Resolved on new checkouts automatically.
- **Checkout loading state added**: "Get started" / upgrade buttons on Pricing page now show a spinner while the checkout session is being created. Buttons are disabled during loading to prevent double-clicks.
- **Settings: manual Save button**: Replaced auto-save-while-typing (which caused "please select country" errors mid-edit) with a Save button. Still auto-saves silently on navigate-away if required fields are filled.
- **Admin new user notification**: Every new registration sends an email to hello@reviewoptic.com with the user's name, email, and company. Uses `sendAdminNewUserEmail` in email.ts, fired from the register endpoint.
- **Delete customer confirmation**: Clicking Delete on a customer now shows a confirmation dialog ("This will permanently delete the customer and all their history. This cannot be undone.") before proceeding.

**Architecture notes:**
- Namecheap DNS for reviewoptic.com: A Record @ → 34.111.179.208, CNAME www → review-optic.replit.app, two TXT records (@ and www) with same Replit verify value. No URL Redirect Record.
- `sendAdminNewUserEmail` in server/email.ts sends to hardcoded `hello@reviewoptic.com` — safe, no env var needed beyond RESEND_API_KEY.
- Settings auto-save on exit uses a `useRef` to track the latest form value and fires `apiRequest` on component unmount, skipping validation (silent save).

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral reward notification email** — when a referrer earns a credit, send them an email confirming it
- **No other pending code tasks** — everything from today is shipped

### Session — 2026-04-09 (sixty-second session)

**Tasks completed:**
- **Non-www redirect DNS confirmed working**: Express middleware was already in place. User added `reviewoptic.com` as a second custom domain in Replit (Deployments → Domains → Connect your own domain). DNS was already pointed from Namecheap. Redirect is fully live.
- **Referral programme built**: Full implementation from scratch (much of the infrastructure was already in place from a prior session):
  - `/referral/:slug` route, `referred_by_account_id` DB column, and registration tracking were already built
  - Added `referral_rewarded` boolean column to users table (DB migration)
  - `billing/confirm`: when a referred user pays, credits the referrer via a Stripe customer balance transaction (negative balance = credit applied to next invoice automatically)
  - Credit amount = monthly price of the plan the referred person signed up on — always uses monthly rate regardless of whether they chose monthly or annual billing
  - If multiple referrals convert, credits stack in Stripe and drain one invoice at a time
  - Added `GET /api/referrals/stats` endpoint returning count of successful (paid) referrals
  - Settings Referral tab updated: replaced "coming soon" placeholder with real reward description and live referral counter
  - T&Cs: added new section 21 "Referral programme" covering all rules (credit value, stacking, annual invoices, no cash value, right to modify)
- **Plan rename + price update**:
  - "Lite" renamed to "Standard" everywhere in the UI (internal DB value stays as `"lite"` — no migration needed)
  - Pro monthly: £49 → £39/month; Pro annual: £539 → £429/year (11 × £39)
  - Standard pricing unchanged: £29/month, £319/year
  - Updated PRICES object in server, Pricing page, Billing page, billing email copy

**Architecture notes:**
- Referral reward logic lives in `billing/confirm` (server/routes.ts). Flow: referred user pays → retrieve referrer's `stripe_customer_id` → `stripe.customers.createBalanceTransaction(referrerCustomerId, { amount: -monthlyAmount, currency: "gbp" })` → mark `referral_rewarded = true` on referred user.
- Credit amount uses `PRICES[\`${plan}_monthly\`].unit_amount` — locked at sign-up, unaffected by plan changes.
- Internal plan_type value in DB is still `"lite"` for Standard plan subscribers. All display labels show "Standard". No DB migration required.
- Pro annual = 11 × £39 = £429 (1 month free baked in). Standard annual = 11 × £29 = £319.

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- No major pending code tasks — referral programme is now live
- Consider adding a referral reward notification email to the referrer when they earn a credit
- Monitor Stripe to confirm balance credits apply correctly once real referrals come in

### Session — 2026-04-08 (sixty-first session)

**Tasks completed:**
- **Email verification crash fixed**: New users clicking the verification link got "site couldn't be reached" — the server was crashing. Root cause: `process.on("unhandledRejection")` calls `process.exit(1)`, and the verify-email route had no try/catch. If the Drizzle DB query threw (e.g. stale Neon connection after inactivity), the server died. Fix: added try/catch to route, added server-side retry (800ms delay) on first failure, added `pool.on("error")` handler to prevent idle client errors crashing the server, added client-side auto-retry (2s delay) before showing any error screen. Users now click once and get verified.
- **Verification email moved to after payment**: Previously sent at registration. Now sent only after Stripe payment confirmed (billing/confirm endpoint already had this logic). BillingSuccess page already shows "check your email to verify" — no UI change needed. Register.tsx "Resend activation email" button removed (not applicable pre-payment). Existing-unverified users who try to re-register now get "account exists, please log in" (400) instead of a re-sent verification link.
- **Logo fixed in emails**: `LOGO_URL` in `server/email.ts` was a module-level constant set at import time, before the `https://` normalisation in `server/index.ts` ran. Result: logo URL was `www.reviewoptic.com/logo.png` (no scheme) — email clients showed a broken image. Fixed: hardcoded to `https://www.reviewoptic.com/logo.png`.
- **30-day free trial copy**: Updated all trial copy from 14 days to 30 days across Pricing, FAQ, T&Cs, Register page, and incomplete-registration email. Deliberately left the "14 days" refund window and notice period in T&Cs unchanged (those are legal clauses, not trial duration).
- **Non-www redirect middleware**: Added Express middleware to 301-redirect `reviewoptic.com` → `https://www.reviewoptic.com`. Deferred DNS setup (add `reviewoptic.com` as second custom domain in Replit + A record in Namecheap) to a future session.
- **Stripe coupon + trial clarification**: Confirmed that a "1 month free" Stripe coupon applied on top of the 30-day trial gives ~60 days free total (trial first, then coupon on first invoice). User confirmed this is intentional.

**Architecture notes:**
- Verification email flow: register → billing → `billing/confirm` sends verification email → BillingSuccess prompts user to check email → user clicks link → verified → dashboard.
- The `billing/confirm` endpoint already had: `if (paidUser && !paidUser.email_verified && paidUser.verification_token)` → send verification email. This is now the ONLY place it's sent.
- `LOGO_URL` and `LOGO_HTML` in `server/email.ts` are now hardcoded to `https://www.reviewoptic.com` — safe because dev environments skip email sends (no RESEND_API_KEY).
- Pool error handler in `server/storage.ts` catches idle client errors silently (logs them but doesn't crash).

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral programme** — still the top pending code task
- **Non-www redirect DNS** — add `reviewoptic.com` as a second custom domain in Replit, then add an A record in Namecheap pointing `@` to Replit's IP. Express middleware is already in place.

### Session — 2026-04-08 (sixtieth session)

**Tasks completed:**
- **Customer delete is now immediate and permanent**: Previously delete was a soft-delete with a 30-day grace period and a "Deleted" tab. User confirmed customers don't need a grace period — changed `deleteCustomer()` to hard-delete immediately. Removed 30-day purge job, `/api/customers/deleted` endpoint, and the Deleted tab from the Customers page UI. Delete toast no longer mentions 30 days. Archive functionality untouched.
- **Favicon fixed**: Updated `favicon.png` in `client/public/` to the proper ReviewOptic icon (speech bubble + checkmark + star from `reviewoptic icon only - square - app.png`). Previous build had the old file in `dist/public/` — rebuilt to sync. Note: hard refresh (`Cmd+Shift+R`) needed to clear browser favicon cache.
- **Privacy Policy section 3 corrected**: Both review request emails and ReviewOptic's own marketing emails now correctly state they contain an unsubscribe link. Removed incorrect "opt out by contacting us" wording.
- **Claira Edwards confirmed deleted**: User deleted her from admin panel. Since she never verified or paid, she had no Stripe subscription — confirmed she will not be charged.

**Important clarification logged:**
- 30-day grace period applies to **user accounts** (when a subscriber deletes their ReviewOptic account, data kept 30 days for potential reactivation) — this is unchanged.
- 30-day soft-delete did NOT apply to **customers** (contact records in a user's customer list) — those now delete immediately.

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral programme** — still the top pending code task

### Session — 2026-04-08 (fifty-ninth session)

**Tasks completed:**
- **Claira Edwards investigation**: Logs showed her registration POST never hit the server — she loaded the register page at 11:32 PM, then tried to submit during a server restart around 2 AM (SIGTERM). Browser showed Safari's "can't establish a secure connection" error. She was already in the DB from before (now visible via new pending registrations section). Fixed: improved network error message in register form ("Unable to reach the server — please try again").
- **Full delete for admin-managed users**: `DELETE /api/admin/user/:userId` now also removes the user from the admin's own customer list (they were auto-added at registration). Previously left a stale customer record.
- **Resend verification button in admin panel**: Added a blue mail icon button next to each unverified pending user. Calls `/api/auth/resend-verification` — one click to resend without the user having to re-attempt registration.
- **Former subscribers — Customers page**: When a user cancels or deletes, they're now moved (not deleted) in the admin's customer list. Status `"subscriber_cancelled"` (amber badge) for cancellations, `"subscriber_deleted"` (grey badge) for account deletions. Deleted accounts automatically get `do_not_contact = true`; cancelled accounts only if they were `email_unsubscribed`. Both filtered out of the main Customers list and shown in a collapsible "Former subscribers" section at the bottom.
- **Subscriber review request**: New daily job sends a 1–5 star rating email to admin's customers (ReviewOptic subscribers) who joined 30+ days ago and haven't been contacted. Creates a proper `review_request` record so the rating flow works normally. Template (`subscriber_review_request`) is editable via a new "ReviewOptic admin templates" section in the admin panel Emails tab — clearly separated from system emails and dialogue boxes. Test button included.
- **Favicon updated**: Replaced generic orange favicon with the proper ReviewOptic icon (speech bubble + checkmark + star) from `reviewoptic icon only - square - app.png`. Resized to 256×256 PNG.
- **Privacy Policy section 3 corrected**: Removed incorrect "opt out by contacting us" wording. Both customer-facing messages and ReviewOptic's own marketing emails now correctly state they include an unsubscribe link for opt-out. Confirmed both `customerUnsubscribeFooter` and `platformUnsubscribeFooter` are present in all relevant email functions.
- **OG image removed from task list**: User confirmed it's not needed.

**Architecture notes:**
- Former subscriber status flow: `customer.subscription.deleted` webhook → `"subscriber_cancelled"` in admin customer list. `DELETE /api/account` → `"subscriber_deleted"` + `do_not_contact = true`.
- Subscriber review request job: queries `customers` joined to `users` to ensure subscriber is verified + paying + not DNC + 30+ days old + still `pending_request`. Creates `review_request` record then calls `sendSubscriberReviewRequestEmail`. Runs daily.
- `subscriber_review_request` template has `adminOnly: true` flag — filtered into its own section in admin panel, excluded from the main system emails list.

**Waiting on (external — unchanged):**
- Meta Business Verification → App Review → WhatsApp
- Once WhatsApp live: update Google Business description to mention WhatsApp

**Notes for next session:**
- **Referral programme** — still the top pending code task
- **Claira Edwards** — needs to delete her existing account via admin panel (trash icon in Pending Registrations) so she can register fresh

