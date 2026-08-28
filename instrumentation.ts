import * as Sentry from "@sentry/nextjs";

/**
 * Registers Sentry for the Node.js and Edge runtimes (see
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation).
 * Every API route in this app runs on "nodejs" (see each route's `runtime`
 * export), but both branches are initialized per the standard Sentry
 * scaffold in case that ever changes.
 *
 * Safe to run unconditionally: the Sentry SDK no-ops if `SENTRY_DSN` isn't
 * set, which is the case until the Vercel Sentry integration is
 * provisioned (`vercel integration add sentry`, then `vercel env pull`) —
 * see README's Error Monitoring section.
 */
export async function register() {
  // VERCEL_ENV is "production" | "preview" | "development" on Vercel;
  // NODE_ENV is the fallback for anything running off Vercel (e.g. a local
  // `npm run dev`). Without this, unset `environment` silently defaults to
  // "production" in Sentry's SDK, making local test traffic indistinguishable
  // from real production errors to any alert rule filtered by environment.
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment,
      tracesSampleRate: 0, // error tracking only for now, no perf tracing
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment,
      tracesSampleRate: 0,
    });
  }
}

/**
 * Reports server-side rendering/route errors that Next.js itself catches
 * (outside the explicit `captureError` call sites in lib/observability),
 * e.g. an uncaught throw in a Server Component. Complements, doesn't
 * replace, the explicit captureError() calls at known failure points.
 */
export const onRequestError = Sentry.captureRequestError;
