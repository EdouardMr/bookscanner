import "server-only";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./client";
import { devices, preferences, scans } from "./schema";
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
