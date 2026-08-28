import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init, run before hydration (see
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client).
 * No-ops if `NEXT_PUBLIC_SENTRY_DSN` isn't set — see README's Error
 * Monitoring section for provisioning.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // NEXT_PUBLIC_VERCEL_ENV requires "Automatically expose System
  // Environment Variables" in Vercel project settings; falls back to
  // NODE_ENV (always available, Next.js inlines it at build time) so
  // local/off-Vercel traffic isn't silently tagged "production" — see
  // instrumentation.ts for the server-side half of this.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0, // error tracking only for now, no perf tracing
});

// Required by the SDK to instrument App Router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
