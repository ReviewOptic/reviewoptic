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

    // Admin column
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`);
    if (process.env.ADMIN_EMAIL) {
      await pool.query(`UPDATE users SET is_admin = true WHERE email = $1`, [process.env.ADMIN_EMAIL.toLowerCase()]);
    }

    console.log("[migrate] Migrations complete");
  } finally {
    await pool.end();
  }
}
