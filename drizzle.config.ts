import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the Next.js runtime, so it doesn't automatically
// load .env.local the way `next dev`/`next build` do — load it explicitly.
config({ path: ".env.local" });

// Migrations should run over Neon's direct (non-pooled) connection, not the
// pooled one the app uses at runtime — pooled connections route through
// PgBouncer in transaction mode, which doesn't support the session-level
// operations drizzle-kit needs. Fall back to DATABASE_URL for non-Neon
// Postgres, where there's only one connection string anyway.
const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in a Neon connection string before running drizzle-kit."
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
