import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in a Neon connection string."
  );
}

// Neon's HTTP driver makes a plain fetch() per query, so there's no
// connection pool to manage from serverless functions — this is why Neon +
// drizzle-orm/neon-http was chosen over a traditional pg Pool.
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
