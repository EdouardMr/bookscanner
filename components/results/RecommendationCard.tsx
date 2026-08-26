import Image from "next/image";
import type { EnrichedBook, Recommendation } from "@/types";
import { RatingStars } from "@/components/ui/RatingStars";

export function RecommendationCard({
  book,
  recommendation,
}: {
  book: EnrichedBook;
  recommendation: Recommendation;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-5 sm:flex-row">
      <div className="mx-auto flex h-40 w-28 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-100 text-4xl sm:mx-0">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt=""
            width={112}
            height={160}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>📖</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <span className="w-fit rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-medium text-white">
          Top pick
        </span>
        <h2 className="text-lg font-semibold text-stone-900">
          {book.canonicalTitle ?? book.title}
        </h2>
        {(book.canonicalAuthor ?? book.author) && (
          <p className="text-sm text-stone-600">
            {book.canonicalAuthor ?? book.author}
          </p>
        )}
        <RatingStars average={book.averageRating} count={book.ratingsCount} />
        <p className="mt-1 text-sm leading-relaxed text-stone-700">
          {recommendation.rationale}
        </p>
        {recommendation.confidenceNote && (
          <p className="text-xs italic text-stone-500">
            {recommendation.confidenceNote}
          </p>
        )}
      </div>
    </div>
  );
}
