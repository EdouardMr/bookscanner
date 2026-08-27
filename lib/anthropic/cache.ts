import "server-only";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Minimal in-memory TTL cache, keyed by string. Process-wide, like
 * `rateLimit.ts`'s counter — same "per warm instance, not global across
 * Vercel instances/regions" caveat applies.
 *
 * Used to make repeat/duplicate Claude API requests (retries, double
 * submits, revisiting a result without changing input) free: a cache hit
 * is checked *before* `enforceRateLimit()`, so it never consumes the
 * 1-call-per-minute budget.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
