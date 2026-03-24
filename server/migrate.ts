import pkg from "pg";
const { Pool } = pkg;
import { randomUUID } from "crypto";

const BOOTSTRAP_ACCOUNT_ID = "bootstrap-account";

export async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
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

    // User profile columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT ''`);

    // Admin column
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`);
    if (process.env.ADMIN_EMAIL) {
      await pool.query(`UPDATE users SET is_admin = true WHERE email = $1`, [process.env.ADMIN_EMAIL.toLowerCase()]);
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

    // Update all default templates to reflect sentiment pre-screen wording
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

    console.log("[migrate] Migrations complete");
  } finally {
    await pool.end();
  }
}
