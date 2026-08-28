import * as Sentry from "@sentry/nextjs";

/**
 * Which subsystem an error came from — mirrors the failure surface mapped
 * out for alerting: "extract" covers both the Anthropic-side failures in
 * httpError.ts and extractBooks.ts's fallback trigger, while
 * "vision-fallback" is kept distinct so the "both vision providers down at
 * once" case (Google Vision also failing after Claude did) stays queryable
 * separately from a routine single-provider fallback.
 */
export type ObservabilityScope =
  | "extract"
  | "recommend"
  | "vision-fallback"
  | "rate-limit"
  | "history"
  | "preferences"
  | "save-scan";

/**
 * Shared entry point for reporting an error to Sentry, called alongside
 * (never instead of) the existing `console.error` at each call site.
 *
 * Tags by `errorType` (the error's constructor name) in addition to
 * `scope` — this is what lets a Sentry alert rule distinguish, e.g., a
 * user simply hitting our own 1-call-per-minute rate limit (expected,
 * throws `RateLimitExceededError` down the same `extract` fallback path)
 * from a genuine Anthropic outage or auth failure, without treating every
 * rate-limit hit as a page-worthy event.
 *
 * Never pass `imageBase64` or `preferences.additionalNotes` (free text) in
 * `extra` — those are the only two pieces of user content in this app that
 * shouldn't reach a third party.
 *
 * Kept free of any DB-touching import (like retryAfter.ts) so it stays
 * importable and unit-testable without `DATABASE_URL` set.
 */
export function captureError(
  error: unknown,
  context: {
    scope: ObservabilityScope;
    deviceId?: string;
    extra?: Record<string, string | number | boolean>;
  }
): void {
  Sentry.captureException(error, {
    tags: {
      scope: context.scope,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    },
    extra: context.extra,
    user: context.deviceId ? { id: context.deviceId } : undefined,
  });
}
