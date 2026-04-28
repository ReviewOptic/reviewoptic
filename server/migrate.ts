import pkg from "pg";
const { Pool } = pkg;
import { randomUUID } from "crypto";

const BOOTSTRAP_ACCOUNT_ID = "bootstrap-account";

export async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Migration tracking — lets us gate one-time data UPDATEs so they never repeat
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR PRIMARY KEY, run_at TIMESTAMP DEFAULT NOW())`);
    const once = async (name: string, fn: () => Promise<void>) => {
      const { rows } = await pool.query(`SELECT 1 FROM schema_migrations WHERE name = $1`, [name]);
      if (rows.length > 0) return;
      await fn();
      await pool.query(`INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING`, [name]);
    };

    // Create accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Update users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id VARCHAR NOT NULL DEFAULT '${BOOTSTRAP_ACCOUNT_ID}'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`);

    // Add accountId to all data tables
    const dataTables = ["customers", "review_requests", "reviews", "private_feedback", "activity_log", "templates", "settings"];
    for (const table of dataTables) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS account_id VARCHAR NOT NULL DEFAULT '${BOOTSTRAP_ACCOUNT_ID}'`);
    }

    // Create bootstrap account if any existing data needs it
    const { rows: existingData } = await pool.query(`SELECT COUNT(*) as cnt FROM customers WHERE account_id = '${BOOTSTRAP_ACCOUNT_ID}'`);
    if (parseInt(existingData[0].cnt) > 0) {
      await pool.query(
        `INSERT INTO accounts (id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [BOOTSTRAP_ACCOUNT_ID]
      );
    }

    // Handle existing settings row: give it accountId and ensure it's linked to bootstrap account
    await pool.query(`UPDATE settings SET account_id = '${BOOTSTRAP_ACCOUNT_ID}' WHERE account_id = '${BOOTSTRAP_ACCOUNT_ID}' OR account_id = ''`);

    // Make email unique constraint on users if it doesn't exist yet (safe to fail)
    try {
      await pool.query(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`);
    } catch { /* constraint may already exist */ }

    // Password reset tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Fix legacy username column if it exists
    await pool.query(`ALTER TABLE users ALTER COLUMN username SET DEFAULT ''`).catch(() => {});
    await pool.query(`UPDATE users SET username = '' WHERE username IS NULL`).catch(() => {});

    // Email verification columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`);
    // Mark existing users as verified so they aren't locked out
    await pool.query(`UPDATE users SET email_verified = true WHERE email_verified = false AND verification_token IS NULL`);

    // Logo URL and position
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_position TEXT NOT NULL DEFAULT 'left'`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS notify_ratings BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_business_account_id TEXT NOT NULL DEFAULT ''`);

    // User profile columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT ''`);

    // Admin column
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`);
    if (process.env.ADMIN_EMAIL) {
      await pool.query(`UPDATE users SET is_admin = true, plan_type = 'complimentary' WHERE email = $1`, [process.env.ADMIN_EMAIL.toLowerCase()]);
    }

    // Admin impersonation log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_impersonation_log (
        id VARCHAR PRIMARY KEY,
        admin_id VARCHAR NOT NULL,
        admin_email TEXT NOT NULL,
        target_user_id VARCHAR NOT NULL,
        target_email TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Migrate bootstrap-account data to the admin user's real account
    // This handles the case where data was created before the multi-user system was set up
    const { rows: adminUsers } = await pool.query(
      `SELECT id, account_id FROM users WHERE is_admin = true LIMIT 1`
    );
    if (adminUsers.length > 0) {
      const adminAccountId = adminUsers[0].account_id;
      const { rows: bootstrapData } = await pool.query(
        `SELECT COUNT(*) as cnt FROM customers WHERE account_id = 'bootstrap-account'`
      );
      if (parseInt(bootstrapData[0].cnt) > 0) {
        for (const table of ["customers", "review_requests", "reviews", "private_feedback", "activity_log", "templates"]) {
          await pool.query(`UPDATE ${table} SET account_id = $1 WHERE account_id = 'bootstrap-account'`, [adminAccountId]);
        }
        // Merge bootstrap settings into admin's settings
        await pool.query(`
          UPDATE settings AS dest
          SET business_name = CASE WHEN src.business_name <> '' THEN src.business_name ELSE dest.business_name END,
              business_email = CASE WHEN src.business_email <> '' THEN src.business_email ELSE dest.business_email END,
              google_review_link = src.google_review_link,
              facebook_review_link = src.facebook_review_link,
              trustpilot_link = src.trustpilot_link,
              tripadvisor_link = src.tripadvisor_link,
              checkatrade_link = src.checkatrade_link,
              mybuilder_link = src.mybuilder_link
          FROM settings AS src
          WHERE dest.account_id = $1 AND src.account_id = 'bootstrap-account'
        `, [adminAccountId]);
        await pool.query(`DELETE FROM settings WHERE account_id = 'bootstrap-account'`);
        console.log(`[migrate] Migrated bootstrap-account data to admin account ${adminAccountId}`);
      }
    }

    // Fix stranded non-admin users sharing the bootstrap account
    // Any non-admin user with account_id = 'bootstrap-account' needs their own isolated account
    const { rows: strandedUsers } = await pool.query(`
      SELECT id, email FROM users
      WHERE account_id = $1 AND is_admin = false
    `, [BOOTSTRAP_ACCOUNT_ID]);

    for (const user of strandedUsers) {
      const newAccountId = randomUUID();
      // Create a new account for this user
      await pool.query(`INSERT INTO accounts (id) VALUES ($1) ON CONFLICT DO NOTHING`, [newAccountId]);
      // Move the user to their new account
      await pool.query(`UPDATE users SET account_id = $1 WHERE id = $2`, [newAccountId, user.id]);
      // Move any data rows that belong exclusively to this user (none expected for bootstrap stragglers,
      // but handle gracefully by migrating rows where customer_id etc. matches)
      // Create default settings for the new account so the app loads cleanly
      await pool.query(`
        INSERT INTO settings (id, account_id, business_name)
        VALUES ($1, $2, '')
        ON CONFLICT DO NOTHING
      `, [randomUUID(), newAccountId]);
      console.log(`[migrate] Gave user ${user.email} their own account: ${newAccountId}`);
    }

    // Stripe billing columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_period TEXT NOT NULL DEFAULT 'monthly'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`);

    // Chat messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Track which user sent each review request (for per-user analytics)
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS sent_by_user_id TEXT`);

    // Team / sub-user columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by TEXT`);

    // Monthly insight email tracking
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_insight_email_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insight_emails_opt_out BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS insight_email_frequency TEXT NOT NULL DEFAULT 'weekly'`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insight_email_log (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        account_id VARCHAR NOT NULL,
        email TEXT NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        opened_at TIMESTAMP
      )
    `);

    // Team member active/inactive status
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);

    // Template tracking on review requests
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS template_id TEXT`);

    // Response templates: preferred platform for positive response templates
    await pool.query(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS preferred_platform TEXT NOT NULL DEFAULT ''`);

    // Sentiment pre-screen: star rating on review requests, extended private_feedback fields
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS rating INTEGER`);
    await pool.query(`ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS review_request_id TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS response TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP`);

    // Update all default templates to reflect sentiment pre-screen wording (one-time)
    await once("sentiment_prescreen_wording", async () => {
      await pool.query(`
        UPDATE templates SET
          subject = 'How would you rate your experience with {{business_name}}?',
          body = E'Hi {{first_name}},\n\nThank you for choosing {{business_name}}! We''d love to hear how we did — it only takes a second.\n\nClick below to rate your experience:\n\n{{review_link}}\n\nIf you loved it, we''ll ask if you''d like to share it publicly. If something wasn''t right, we''d like to know so we can make it right.\n\nThanks so much,\nThe {{business_name}} team'
        WHERE template_type = 'review_request' AND channel = 'email' AND is_default = true
      `);
      await pool.query(`
        UPDATE templates SET
          subject = 'Would you mind sharing your experience?',
          body = E'Hi {{first_name}},\n\nWe''re so glad you had a positive experience with {{business_name}}! If you have a spare moment, it would mean the world to us if you''d share your thoughts in a quick public review.\n\n{{review_link}}\n\nIt really does make a difference. Thank you!\n\nThe {{business_name}} team'
        WHERE template_type = 'follow_up' AND channel = 'email' AND is_default = true
      `);
      await pool.query(`
        UPDATE templates SET
          body = 'Hi {{first_name}}, how would you rate your experience with {{business_name}}? Tap here to let us know — takes just a second: {{review_link}}'
        WHERE template_type = 'review_request' AND channel = 'sms' AND is_default = true
      `);
      await pool.query(`
        UPDATE templates SET
          body = E'Hi {{first_name}}, glad you had a great experience with {{business_name}}! Would you mind sharing it in a quick review? {{review_link}} — thanks so much!'
        WHERE template_type = 'follow_up' AND channel = 'sms' AND is_default = true
      `);
      await pool.query(`
        UPDATE templates SET
          body = E'Hi {{first_name}} 👋 Thanks for choosing {{business_name}}! How would you rate your experience? Tap the link to let us know — it only takes a second and really helps us improve:\n\n{{review_link}}'
        WHERE template_type = 'review_request' AND channel = 'whatsapp' AND is_default = true
      `);
      await pool.query(`
        UPDATE templates SET
          body = E'Hi {{first_name}}, we''re thrilled you had a great experience with {{business_name}}! 🌟 If you have a moment, would you mind sharing it in a quick review? It means a lot to us:\n\n{{review_link}}'
        WHERE template_type = 'follow_up' AND channel = 'whatsapp' AND is_default = true
      `);
    });

    // Store which recording was sent with a review request (for landing page media embed)
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS recording_url TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS recording_type TEXT NOT NULL DEFAULT ''`);

    // Recordings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recordings (
        id VARCHAR PRIMARY KEY,
        account_id VARCHAR NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        elevenlabs_voice_id TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Migrate existing voice/video from settings into recordings table
    const { rows: settingsRows } = await pool.query(`SELECT account_id, voice_note_url, video_message_url, elevenlabs_voice_id FROM settings WHERE (voice_note_url <> '' OR video_message_url <> '')`);
    for (const s of settingsRows) {
      if (s.voice_note_url) {
        const { rows: existing } = await pool.query(`SELECT id FROM recordings WHERE account_id = $1 AND type = 'voice' AND url = $2`, [s.account_id, s.voice_note_url]);
        if (existing.length === 0) {
          const { randomUUID } = await import("crypto");
          await pool.query(`INSERT INTO recordings (id, account_id, type, label, url, elevenlabs_voice_id) VALUES ($1, $2, 'voice', 'Default', $3, $4)`,
            [randomUUID(), s.account_id, s.voice_note_url, s.elevenlabs_voice_id || ""]);
        }
      }
      if (s.video_message_url) {
        const { rows: existing } = await pool.query(`SELECT id FROM recordings WHERE account_id = $1 AND type = 'video' AND url = $2`, [s.account_id, s.video_message_url]);
        if (existing.length === 0) {
          const { randomUUID } = await import("crypto");
          await pool.query(`INSERT INTO recordings (id, account_id, type, label, url) VALUES ($1, $2, 'video', 'Default', $3)`,
            [randomUUID(), s.account_id, s.video_message_url]);
        }
      }
    }

    // Archived flag for customers
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE`);

    // Third follow-up delay
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_3_days INTEGER NOT NULL DEFAULT 14`);

    // Platform clicks tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_platform_clicks (
        id VARCHAR PRIMARY KEY,
        request_id VARCHAR NOT NULL,
        account_id VARCHAR NOT NULL,
        platform TEXT NOT NULL,
        clicked_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Default send time preference
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_send_time TEXT NOT NULL DEFAULT ''`);

    // Email open tracking
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP`);

    // Automated platform review requests (ReviewOptic collecting its own reviews)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_review_requested_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_review_follow_ups INTEGER NOT NULL DEFAULT 0`);

    // Per-request response template overrides
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS positive_template_id TEXT`);
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS negative_template_id TEXT`);

    // Force-set all default response templates to their final clean state (one-time)
    await once("response_template_defaults_v1", async () => {
      const positiveBody = "We hope you enjoyed your experience with {{business_name}} and our {{service_type}}! Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!";
      const defaultResponseTemplates = [
        { type: "response_positive", channel: "email",    subject: "Thank you for your rating", body: positiveBody },
        { type: "response_positive", channel: "sms",      subject: "", body: positiveBody },
        { type: "response_positive", channel: "whatsapp", subject: "", body: positiveBody },
        { type: "response_negative", channel: "email",    subject: "We'd love to make this right", body: "We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}" },
        { type: "response_negative", channel: "sms",      subject: "", body: "We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}" },
        { type: "response_negative", channel: "whatsapp", subject: "", body: "We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}" },
      ];
      for (const t of defaultResponseTemplates) {
        await pool.query(
          `UPDATE templates SET subject = $1, body = $2 WHERE template_type = $3 AND channel = $4 AND is_default = true`,
          [t.subject, t.body, t.type, t.channel]
        );
      }

      // Strip {{review_link}} from all template bodies — the link is now auto-appended by the server
      await pool.query(`
        UPDATE templates
        SET body = TRIM(REGEXP_REPLACE(body, '[^\\n]*\\{\\{review_link\\}\\}[^\\n]*\\n?', '', 'g'))
        WHERE body LIKE '%{{review_link}}%'
      `);

      // Remove {{review_link}} from positive response templates (now shown as buttons on the page)
      await pool.query(`
        UPDATE templates
        SET body = TRIM(
          REGEXP_REPLACE(
            REGEXP_REPLACE(body, '[^\\n]*\\{\\{review_link\\}\\}[^\\n]*\\n?', '', 'g'),
            '\\n{2,}', E'\\n\\n', 'g'
          )
        )
        WHERE template_type = 'response_positive'
          AND body LIKE '%{{review_link}}%'
      `);
    });

    // Platform email unsubscribe flag for users
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN NOT NULL DEFAULT false`);

    // Fix follow-up subject lines to be consistent and non-misleading (one-time)
    await once("follow_up_subjects_v1", async () => {
      await pool.query(`UPDATE templates SET subject = 'Just checking in' WHERE template_type = 'follow_up_1' AND is_default = true`);
      await pool.query(`UPDATE templates SET subject = 'A polite reminder' WHERE template_type = 'follow_up_2' AND is_default = true`);
      await pool.query(`UPDATE templates SET subject = 'We''d still love to hear from you' WHERE template_type = 'follow_up_3' AND is_default = true`);
    });

    // Create follow_up_1/2/3 templates for SMS and WhatsApp (were never seeded — accounts only had old "follow_up" type)
    const fuSlots = [
      {
        type: "follow_up_1",
        smsBody: "Just checking in! We'd love to hear from you — tap below:",
        waBody: "😊 Just a quick follow-up from {{business_name}} — we'd love to hear how we did! Tap the link below to leave your rating:",
      },
      {
        type: "follow_up_2",
        smsBody: "We'd still love your feedback! Tap below when you get a moment:",
        waBody: "💛 We know you're busy, but your feedback really means a lot to {{business_name}}! Tap the link below whenever you're ready:",
      },
      {
        type: "follow_up_3",
        smsBody: "Last message from us! We'd still love your feedback — tap below:",
        waBody: "🙏 This is our last message, we promise! If you ever have a moment, we'd still love to hear from you — tap the link below:",
      },
    ];
    for (const slot of fuSlots) {
      for (const [channel, body] of [["sms", slot.smsBody], ["whatsapp", slot.waBody]] as const) {
        await pool.query(`
          INSERT INTO templates (id, account_id, name, template_type, channel, is_default, subject, body, preferred_platform, video_url, audio_url, updated_at)
          SELECT gen_random_uuid(), a.id, $1, $2, $3, true, '', $4, '', '', '', NOW()
          FROM (SELECT DISTINCT account_id AS id FROM templates) a
          WHERE NOT EXISTS (
            SELECT 1 FROM templates t2
            WHERE t2.account_id = a.id AND t2.template_type = $2 AND t2.channel = $3
          )
        `, [slot.type === "follow_up_1" ? "Follow-up 1" : slot.type === "follow_up_2" ? "Follow-up 2" : "Follow-up 3", slot.type, channel, body]);
      }
    }

    // ── Canonical template defaults — one-time only ──
    await once("canonical_templates_v2", async () => {
      const posBody = `We hope you enjoyed your experience with {{business_name}} and our {{service_type}}! Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{owner_name}}\n{{business_name}}`;
      const negBody = `We would appreciate your feedback on how we can improve for next time and will be in touch.\n\nMany thanks,\n{{owner_name}}\n{{business_name}}`;

      // Response templates — body same across all channels
      await pool.query(`UPDATE templates SET body = $1 WHERE template_type = 'response_positive'`, [posBody]);
      await pool.query(`UPDATE templates SET body = $1 WHERE template_type = 'response_negative'`, [negBody]);
      // Response template subjects (email only)
      await pool.query(`UPDATE templates SET subject = 'Thank you for your rating' WHERE template_type = 'response_positive' AND channel = 'email'`);
      await pool.query(`UPDATE templates SET subject = 'We''d love to make this right' WHERE template_type = 'response_negative' AND channel = 'email'`);

      // Email follow-ups
      await pool.query(`UPDATE templates SET body = 'Just a quick follow-up from {{business_name}} — we''d love to hear how we did!\n\nTap the link below to leave your rating.\n\nThanks,\n{{owner_name}}\n{{business_name}}', subject = 'Just checking in' WHERE template_type IN ('follow_up', 'follow_up_1') AND channel = 'email'`);
      await pool.query(`UPDATE templates SET body = 'We know you''re busy, but your feedback really means a lot to {{business_name}}!\n\nTap the link below whenever you''re ready.\n\nThanks,\n{{owner_name}}\n{{business_name}}', subject = 'A polite reminder' WHERE template_type = 'follow_up_2' AND channel = 'email'`);
      await pool.query(`UPDATE templates SET body = 'This is our last message, we promise! If you ever have a moment, we''d still love to hear from you.\n\nTap the link below.\n\nThanks,\n{{owner_name}}\n{{business_name}}', subject = 'We''d still love to hear from you' WHERE template_type = 'follow_up_3' AND channel = 'email'`);

      // SMS follow-ups
      await pool.query(`UPDATE templates SET body = 'Just a quick follow-up from {{business_name}} — we''d love to hear how we did!' WHERE template_type = 'follow_up_1' AND channel = 'sms'`);
      await pool.query(`UPDATE templates SET body = 'Your feedback means a lot to us — tap below when you''re ready!\n{{business_name}}' WHERE template_type = 'follow_up_2' AND channel = 'sms'`);
      await pool.query(`UPDATE templates SET body = 'Last one from us! If you get a moment, we''d love your feedback.\n{{business_name}}' WHERE template_type = 'follow_up_3' AND channel = 'sms'`);

      // WhatsApp follow-ups
      await pool.query(`UPDATE templates SET body = '😊 Just a quick follow-up from {{business_name}} — we''d love to hear how we did! Tap the link below when you get a moment 👇' WHERE template_type = 'follow_up_1' AND channel = 'whatsapp'`);
      await pool.query(`UPDATE templates SET body = '💛 Your feedback really means a lot to us! Whenever you''re ready, just tap the link below — we appreciate it 🙏\n\n{{business_name}}' WHERE template_type = 'follow_up_2' AND channel = 'whatsapp'`);
      await pool.query(`UPDATE templates SET body = '🙏 Last message from us, we promise! If you ever get a moment, we''d genuinely love to hear from you.\n\n{{business_name}}' WHERE template_type = 'follow_up_3' AND channel = 'whatsapp'`);
    });

    // ── Negative template body — remove sign-off (it's a pop-up, not an email) ──
    await once("negative_template_v3", async () => {
      await pool.query(`UPDATE templates SET body = 'We would appreciate your feedback on how we can improve for next time and will be in touch.' WHERE template_type = 'response_negative'`);
    });

    // ── Response template sign-off update — remove {{owner_name}}, just {{business_name}} ──
    await once("response_templates_v4", async () => {
      const posBody = `We hope you enjoyed your experience with {{business_name}} and our {{service_type}}! Your feedback means a lot to us and helps us continue to improve. If you could take a moment to share your thoughts by leaving us a review, we would greatly appreciate it! Thank you for being a valued customer!\n\n{{business_name}}`;
      const negBody = `We would appreciate your feedback on how we can improve for next time and will be in touch.\n\n{{business_name}}`;
      await pool.query(`UPDATE templates SET body = $1 WHERE template_type = 'response_positive'`, [posBody]);
      await pool.query(`UPDATE templates SET body = $1 WHERE template_type = 'response_negative'`, [negBody]);
    });

    // Create email follow_up_1/2/3 for any accounts that still only have the old "follow_up" type
    for (const [type, name, subject, body] of [
      ["follow_up_1", "Follow-up 1", "Just checking in", "Just a quick follow-up from {{business_name}} — we'd love to hear how we did!\n\nTap the link below to leave your rating.\n\nThanks,\n{{owner_name}}\n{{business_name}}"],
      ["follow_up_2", "Follow-up 2", "A polite reminder", "We know you're busy, but your feedback really means a lot to {{business_name}}!\n\nTap the link below whenever you're ready.\n\nThanks,\n{{owner_name}}\n{{business_name}}"],
      ["follow_up_3", "Follow-up 3", "We'd still love to hear from you", "This is our last message, we promise! If you ever have a moment, we'd still love to hear from you.\n\nTap the link below.\n\nThanks,\n{{owner_name}}\n{{business_name}}"],
    ] as const) {
      await pool.query(`
        INSERT INTO templates (id, account_id, name, template_type, channel, is_default, subject, body, preferred_platform, video_url, audio_url, updated_at)
        SELECT gen_random_uuid(), a.id, $1, $2, 'email', true, $3, $4, '', '', '', NOW()
        FROM (SELECT DISTINCT account_id AS id FROM templates) a
        WHERE NOT EXISTS (SELECT 1 FROM templates t2 WHERE t2.account_id = a.id AND t2.template_type = $2 AND t2.channel = 'email')
      `, [name, type, subject, body]);
    }

    // Rename old plan types to new names (standard → pro, agency → pro)
    await pool.query(`UPDATE users SET plan_type = 'pro' WHERE plan_type IN ('standard', 'agency')`);

    // Account deletion scheduling
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_for_deletion_at TIMESTAMP`);

    // Zapier webhook token (unique per account, generated on first use)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_token TEXT`);

    // Referral tracking
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_account_id VARCHAR`);

    // DB-backed scheduled sends (survives server restarts — used for job-completion scheduling and Zapier)
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMP`);
    await pool.query(`ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS schedule_status TEXT NOT NULL DEFAULT 'sent'`);

    // QR scan feedback source tracking
    await pool.query(`ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'review_request'`);

    // Trial tracking — store trial end date so we can send a reminder 2 days before
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_reminder_sent BOOLEAN NOT NULL DEFAULT false`);

    // T&Cs acceptance — legal record of when user accepted terms
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP`);

    // Subscription confirmation email — sent exactly once on first real payment
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_confirmation_sent BOOLEAN NOT NULL DEFAULT false`);

    // Soft-delete customers — permanently purged after 30 days, ratings/requests preserved in stats
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);

    // Per-account font family selection
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'Inter'`);

    // In-app notifications
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '/customers',
      read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Push notification subscriptions (PWA)
    await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Editable system email templates
    await pool.query(`CREATE TABLE IF NOT EXISTS system_email_templates (
      type TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    // Admin manual suspension
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false`);

    // Payment failure suspension flag
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed_count INTEGER NOT NULL DEFAULT 0`);

    // Business type — used to personalise insight email benchmarks and AI tips
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT ''`);

    console.log("[migrate] Migrations complete");
  } finally {
    await pool.end();
  }
}
