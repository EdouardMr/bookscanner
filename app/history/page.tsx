"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { ScanHistoryEntry } from "@/types";

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/history");
      const data = (await res.json()) as { scans?: ScanHistoryEntry[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't load your reading history.");
      setScans(data.scans ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your reading history.");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-stone-900">
          📚 bookscanner
        </Link>
        <Link href="/scan" className="text-sm font-medium text-amber-700 underline underline-offset-2">
          New scan
        </Link>
      </header>

      <div>
        <h1 className="text-xl font-semibold text-stone-900">Reading history</h1>
        <p className="mt-1 text-sm text-stone-500">
          Past scans from this browser. The original photos aren&apos;t kept —
          only what was detected and recommended.
        </p>
      </div>

      {!scans && !error && <Spinner label="Loading history…" />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {scans && scans.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-stone-600">No scans yet.</p>
          <Link href="/scan" className="font-medium text-amber-700 underline underline-offset-2">
            Scan your first shelf
          </Link>
        </div>
      )}

      {scans && scans.length > 0 && (
        <ul className="flex flex-col gap-4">
          {scans.map((scan) => {
            const topPick = [...scan.recommendation.picks].sort(
              (a, b) => a.rank - b.rank
            )[0];
            const topBook = topPick
              ? scan.detectedBooks.find((b) => b.id === topPick.bookId)
              : undefined;

            return (
              <li key={scan.id} className="flex flex-col gap-2 rounded-xl border border-stone-200 p-4">
                <p className="text-xs text-stone-400">
                  {new Date(scan.createdAt).toLocaleString()}
                </p>
                {topBook && (
                  <p className="font-medium text-stone-900">
                    Recommended: {topBook.canonicalTitle ?? topBook.title}
                  </p>
                )}
                {topPick && (
                  <p className="text-sm text-stone-600">{topPick.rationale}</p>
                )}
                <p className="text-xs text-stone-500">
                  {scan.detectedBooks.length} book
                  {scan.detectedBooks.length === 1 ? "" : "s"} detected on this
                  shelf
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
