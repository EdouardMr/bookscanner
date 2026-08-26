"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/state/wizardStorage";
import { RecommendationCard } from "@/components/results/RecommendationCard";
import { AlternatePicksList } from "@/components/results/AlternatePicksList";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { EnrichedBook, Recommendation, RecommendResponse } from "@/types";

export default function ResultsPage() {
  const router = useRouter();
  const { books, preferences, recommendation, setRecommendation, reset } =
    useWizard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (books.length === 0 || recommendation) return;
    fetchRecommendation();
    // Only auto-run once per arrival at this step; re-runs are user-triggered
    // via the retry button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRecommendation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books, preferences }),
      });
      const data = (await res.json()) as RecommendResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't get a recommendation.");
      setRecommendation(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't get a recommendation."
      );
    } finally {
      setLoading(false);
    }
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-stone-600">Scan a shelf first to get a recommendation.</p>
        <Link href="/scan" className="font-medium text-amber-700 underline underline-offset-2">
          Go to scan
        </Link>
      </div>
    );
  }

  const bookById = new Map<string, EnrichedBook>(books.map((b) => [b.id, b]));
  const ranked = recommendation
    ? [...recommendation.picks].sort((a, b) => a.rank - b.rank)
    : [];
  const [topPick, ...rest] = ranked;
  const topBook = topPick ? bookById.get(topPick.bookId) : undefined;

  const alternates = rest
    .map((r) => {
      const book = bookById.get(r.bookId);
      return book ? { book, recommendation: r } : null;
    })
    .filter(
      (p): p is { book: EnrichedBook; recommendation: Recommendation } =>
        p !== null
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Your pick</h1>
        <p className="mt-1 text-sm text-stone-500">
          Based on your shelf and your taste.
        </p>
      </div>

      {loading && <Spinner label="Thinking about your shelf…" />}
      {error && <ErrorBanner message={error} onRetry={fetchRecommendation} />}

      {!loading && !error && topPick && topBook && (
        <>
          <RecommendationCard book={topBook} recommendation={topPick} />
          {recommendation?.overallNote && (
            <p className="text-sm italic text-stone-500">
              {recommendation.overallNote}
            </p>
          )}
          <AlternatePicksList picks={alternates} />
        </>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <Link
          href="/history"
          className="text-sm font-medium text-stone-600 underline underline-offset-2"
        >
          View reading history
        </Link>
        <button
          type="button"
          onClick={() => {
            reset();
            router.push("/scan");
          }}
          className="text-sm font-medium text-amber-700 underline underline-offset-2"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
