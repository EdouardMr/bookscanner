"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root error boundary — catches uncaught render errors that escape every
 * other boundary in the app. Reported separately from the explicit
 * lib/observability/captureError.ts call sites (which cover known
 * API/backend failure modes): this is the last-resort net for anything
 * neither of those anticipated, so it's tagged "render" rather than one of
 * ObservabilityScope's enumerated backend scopes.
 *
 * global-error replaces the root layout when active, so per Next.js's
 * convention it defines its own <html>/<body> and doesn't inherit
 * app/layout.tsx's fonts or globals.css — kept intentionally plain.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { scope: "render" } });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Something went wrong.
        </h1>
        <p style={{ color: "#666" }}>
          We&apos;ve been notified and are looking into it.
        </p>
        <button
          onClick={() => retry()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
