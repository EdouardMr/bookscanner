import "server-only";

const WINDOW_MS = 60_000;

/** Timestamp (ms) of the last permitted Claude API call, process-wide. */
let lastCallAt = 0;

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      `Rate limit exceeded: only one Claude API call is allowed per minute. Try again in ${retryAfterSeconds}s.`
    );
    this.name = "RateLimitExceededError";
  }
}

/**
 * Hard app-level cap of one Claude API call per minute, shared across every
 * caller (scan and recommend alike) in this process. Call this immediately
 * before each `anthropic.messages.parse`/`create` call; it throws
 * `RateLimitExceededError` — mapped to an HTTP 429 in `httpError.ts` — if a
 * call lands before the previous one's window has elapsed, and otherwise
 * records this call as the new window start.
 *
 * In-memory only: this limits calls within a single server process. On
 * Vercel that means per warm lambda instance, not globally across every
 * instance/region — for a hard cross-instance limit this would need a
 * shared store (e.g. Postgres or Redis) instead.
 */
export function enforceRateLimit(): void {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < WINDOW_MS) {
    throw new RateLimitExceededError(Math.ceil((WINDOW_MS - elapsed) / 1000));
  }
  lastCallAt = now;
}
