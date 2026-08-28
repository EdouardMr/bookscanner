import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
    ],
  },
};

// Wraps the config for source-map upload (org/project come from the Vercel
// Sentry integration's env vars) and Sentry's Next.js build-time plugins.
// A no-op if SENTRY_ORG/SENTRY_PROJECT aren't set — see README's Error
// Monitoring section.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
