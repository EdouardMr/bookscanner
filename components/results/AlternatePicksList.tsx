import type { EnrichedBook, Recommendation } from "@/types";

interface Pick {
  book: EnrichedBook;
  recommendation: Recommendation;
}

export function AlternatePicksList({ picks }: { picks: Pick[] }) {
  if (picks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-stone-500">Also worth a look</h3>
      <ul className="flex flex-col gap-3">
        {picks.map(({ book, recommendation }) => (
          <li key={book.id} className="rounded-lg border border-stone-200 p-3">
            <p className="font-medium text-stone-900">
              {book.canonicalTitle ?? book.title}
            </p>
            {(book.canonicalAuthor ?? book.author) && (
              <p className="text-sm text-stone-500">
                {book.canonicalAuthor ?? book.author}
              </p>
            )}
            <p className="mt-1 text-sm text-stone-600">
              {recommendation.rationale}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
