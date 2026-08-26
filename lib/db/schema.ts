import {
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import type { EnrichedBook, RecommendResponse } from "@/lib/validation/schemas";

/**
 * One row per anonymous device (identified by a long-lived cookie — see
 * lib/device/deviceId.ts). There is no login, so this is the only concept of
 * "user" the app has.
 */
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A single row per device, upserted whenever the preferences form is saved.
 * Arrays/free text are stored as-is; there's no need for a join table since
 * preferences are always read/written as one whole object per device.
 */
export const preferences = pgTable("preferences", {
  deviceId: uuid("device_id")
    .primaryKey()
    .references(() => devices.id, { onDelete: "cascade" }),
  genres: text("genres").array().notNull().default([]),
  favoriteAuthors: text("favorite_authors").array().notNull().default([]),
  favoriteBooks: text("favorite_books").array().notNull().default([]),
  mood: text("mood"),
  lengthPreference: text("length_preference").notNull().default("no-preference"),
  additionalNotes: text("additional_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One row per completed scan+recommendation. The uploaded photo itself is
 * never stored anywhere — only what was extracted from it, as JSON. This is
 * what powers the /history page.
 */
export const scans = pgTable("scans", {
  id: uuid("id").primaryKey(),
  deviceId: uuid("device_id")
    .notNull()
    .references(() => devices.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  detectedBooks: jsonb("detected_books").$type<EnrichedBook[]>().notNull(),
  recommendation: jsonb("recommendation").$type<RecommendResponse>().notNull(),
});
