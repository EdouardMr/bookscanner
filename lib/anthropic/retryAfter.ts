/**
 * Pure, dependency-free by design: lib/anthropic/rateLimit.ts transitively
 * imports lib/db/client.ts, which throws at import time if DATABASE_URL
 * isn't set (true in the test environment — vitest doesn't load
 * .env.local). Keeping this here, not inline in rateLimit.ts, is what lets
 * it be unit tested without a DB.
 */
export function computeRetryAfterSeconds(
  lastCallAt: Date,
  windowMs: number,
  now = Date.now()
): number {
  const elapsed = now - lastCallAt.getTime();
  return Math.max(1, Math.ceil((windowMs - elapsed) / 1000));
}
