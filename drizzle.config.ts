import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  tablesFilter: [
    "!schema_migrations",
    "!chat_messages",
    "!insight_email_log",
    "!recordings",
    "!review_platform_clicks",
    "!notifications",
    "!push_subscriptions",
    "!system_email_templates",
    "!platform_settings",
    "!blog_posts",
  ],
});
