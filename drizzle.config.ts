import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the Next.js runtime, so it doesn't automatically
// load .env.local the way `next dev`/`next build` do — load it explicitly.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in a Neon connection string before running drizzle-kit."
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
