import "server-only";
import {
  tryRecordRateLimitedCall,
  getRateLimitLastCallAt,
} from "@/lib/db/queries";
import { computeRetryAfterSeconds } from "./retryAfter";

export { computeRetryAfterSeconds } from "./retryAfter";

const WINDOW_MS = 60_000;

export type RateLimitScope = "extract" | "recommend";

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      `Rate limit exceeded: only one Claude API call is allowed per minute. Try again in ${retryAfterSeconds}s.`
    );
    this.name = "RateLimitExceededError";
  }
}

/**
 * Hard app-level cap of one Claude API call per minute per (device,
 * scope), backed by Postgres so it's enforced correctly across every
 * Vercel instance/region — not just within one warm lambda, unlike a
 * naive in-memory counter would be. `scope` separates the extract (scan)
 * and recommend budgets so a normal scan-then-recommend flow doesn't
 * self-trigger the limit on its second call.
 *
 * Fails open (logs and allows the call through) if the DB check itself
 * errors, rather than turning a transient Neon issue into an outage of
 * scanning/recommending — a real "over limit" is signaled by
 * tryRecordRateLimitedCall's return value, not an exception, so this
 * can't mask a genuine denial.
 */
export async function enforceRateLimit(
  deviceId: string,
  scope: RateLimitScope
): Promise<void> {
  let allowed: { lastCallAt: Date } | undefined;
  try {
    allowed = await tryRecordRateLimitedCall(deviceId, scope, WINDOW_MS);
  } catch (dbError) {
    console.error(
      `Rate limit check failed (DB error), failing open for scope "${scope}":`,
      dbError
    );
    return;
  }

  if (allowed) return;

  const lastCallAt = await getRateLimitLastCallAt(deviceId, scope);
  const retryAfterSeconds = lastCallAt
    ? computeRetryAfterSeconds(lastCallAt, WINDOW_MS)
    : Math.ceil(WINDOW_MS / 1000);
  throw new RateLimitExceededError(retryAfterSeconds);
}
