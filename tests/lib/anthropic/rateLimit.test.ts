import { describe, it, expect } from "vitest";
// Imported from retryAfter.ts directly, not rateLimit.ts — rateLimit.ts
// transitively imports lib/db/client.ts, which throws at import time
// without a DATABASE_URL (not set in the test environment).
import { computeRetryAfterSeconds } from "@/lib/anthropic/retryAfter";

describe("computeRetryAfterSeconds", () => {
  const windowMs = 60_000;

  it("returns close to the full window right after a call", () => {
    const now = 1_000_000;
    const lastCallAt = new Date(now);
    expect(computeRetryAfterSeconds(lastCallAt, windowMs, now)).toBe(60);
  });

  it("returns a small value near the window boundary", () => {
    const now = 1_000_000;
    const lastCallAt = new Date(now - (windowMs - 1_000));
    expect(computeRetryAfterSeconds(lastCallAt, windowMs, now)).toBe(1);
  });

  it("clamps to 1 rather than 0 or negative once the window has fully elapsed", () => {
    const now = 1_000_000;
    const lastCallAt = new Date(now - windowMs);
    expect(computeRetryAfterSeconds(lastCallAt, windowMs, now)).toBe(1);

    const longPast = new Date(now - windowMs * 10);
    expect(computeRetryAfterSeconds(longPast, windowMs, now)).toBe(1);
  });

  it("rounds up to the next whole second", () => {
    const now = 1_000_000;
    const lastCallAt = new Date(now - 500); // 59.5s remaining
    expect(computeRetryAfterSeconds(lastCallAt, windowMs, now)).toBe(60);
  });
});
