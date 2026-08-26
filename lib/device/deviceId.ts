import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getOrCreateDevice } from "@/lib/db/queries";

const COOKIE_NAME = "device_id";
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2;

/**
 * Reads (or mints) the anonymous device id used to scope preferences and
 * reading history. There is no login — this cookie is the entire identity
 * model, by design (see the plan's Persistence decision). Only callable from
 * Route Handlers / Server Actions, since it may write a cookie.
 */
export async function getDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  const deviceId = existing ?? randomUUID();

  if (!existing) {
    cookieStore.set(COOKIE_NAME, deviceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TWO_YEARS_SECONDS,
      path: "/",
    });
  }

  // Cheap upsert; keeps the devices table in sync even if the cookie
  // outlives a database reset, or predates the devices row for some reason.
  await getOrCreateDevice(deviceId);

  return deviceId;
}
