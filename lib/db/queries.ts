import "server-only";
import { eq, and, sql, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./client";
import { devices, preferences, scans, rateLimits } from "./schema";
import {
  EMPTY_PREFERENCES,
  type EnrichedBook,
  type Preferences,
  type RecommendResponse,
  type ScanHistoryEntry,
} from "@/lib/validation/schemas";

/** Ensures a `devices` row exists for this id. Safe to call on every request. */
export async function getOrCreateDevice(deviceId: string): Promise<void> {
  await db.insert(devices).values({ id: deviceId }).onConflictDoNothing();
}

export async function getPreferences(deviceId: string): Promise<Preferences> {
  const [row] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.deviceId, deviceId))
    .limit(1);

  if (!row) return EMPTY_PREFERENCES;

  return {
    genres: row.genres,
    favoriteAuthors: row.favoriteAuthors,
    favoriteBooks: row.favoriteBooks,
    mood: (row.mood ?? undefined) as Preferences["mood"],
    lengthPreference: row.lengthPreference as Preferences["lengthPreference"],
    additionalNotes: row.additionalNotes ?? undefined,
  };
}

export async function upsertPreferences(
  deviceId: string,
  prefs: Preferences
): Promise<void> {
  await db
    .insert(preferences)
    .values({
      deviceId,
      genres: prefs.genres,
      favoriteAuthors: prefs.favoriteAuthors,
      favoriteBooks: prefs.favoriteBooks,
      mood: prefs.mood ?? null,
      lengthPreference: prefs.lengthPreference,
      additionalNotes: prefs.additionalNotes ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: preferences.deviceId,
      set: {
        genres: prefs.genres,
        favoriteAuthors: prefs.favoriteAuthors,
        favoriteBooks: prefs.favoriteBooks,
        mood: prefs.mood ?? null,
        lengthPreference: prefs.lengthPreference,
        additionalNotes: prefs.additionalNotes ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function saveScan(
  deviceId: string,
  detectedBooks: EnrichedBook[],
  recommendation: RecommendResponse
): Promise<void> {
  await db.insert(scans).values({
    id: randomUUID(),
    deviceId,
    detectedBooks,
    recommendation,
  });
}

export async function listScans(deviceId: string): Promise<ScanHistoryEntry[]> {
  const rows = await db
    .select()
    .from(scans)
    .where(eq(scans.deviceId, deviceId))
    .orderBy(desc(scans.createdAt));

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    detectedBooks: row.detectedBooks,
    recommendation: row.recommendation,
  }));
}

/**
 * Atomically checks and records a rate-limited call for (deviceId, scope):
 * inserts a fresh row if none exists (first call, always allowed), or bumps
 * last_call_at only if the existing value is older than windowMs — a single
 * INSERT ... ON CONFLICT DO UPDATE ... WHERE, which Postgres guarantees is
 * atomic on its own without needing an interactive transaction (the
 * neon-http driver used here doesn't support those). Returns the row if the
 * call was allowed (and recorded), or undefined if denied (still within the
 * window).
 */
export async function tryRecordRateLimitedCall(
  deviceId: string,
  scope: string,
  windowMs: number
): Promise<{ lastCallAt: Date } | undefined> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ deviceId, scope, lastCallAt: now })
    .onConflictDoUpdate({
      target: [rateLimits.deviceId, rateLimits.scope],
      set: { lastCallAt: now },
      where: sql`${rateLimits.lastCallAt} < ${cutoff}`,
    })
    .returning({ lastCallAt: rateLimits.lastCallAt });

  return row;
}

/** Only called on the (rare) denied path, to compute retryAfterSeconds. */
export async function getRateLimitLastCallAt(
  deviceId: string,
  scope: string
): Promise<Date | undefined> {
  const [row] = await db
    .select({ lastCallAt: rateLimits.lastCallAt })
    .from(rateLimits)
    .where(and(eq(rateLimits.deviceId, deviceId), eq(rateLimits.scope, scope)))
    .limit(1);
  return row?.lastCallAt;
}
