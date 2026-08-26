import Image from "next/image";
import type { EnrichedBook } from "@/types";
import { RatingStars } from "@/components/ui/RatingStars";

const STATUS_LABEL: Record<EnrichedBook["matchStatus"], string> = {
  matched: "Matched",
  ambiguous: "Possible match",
  unmatched: "Unverified",
};

const STATUS_CLASSES: Record<EnrichedBook["matchStatus"], string> = {
  matched: "bg-emerald-50 text-emerald-700",
  ambiguous: "bg-amber-50 text-amber-700",
  unmatched: "bg-stone-100 text-stone-500",
};

export function DetectedBooksList({ books }: { books: EnrichedBook[] }) {
  if (books.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3">
      {books.map((book) => {
        const lowConfidence = book.confidence < 0.4;
        return (
          <li
            key={book.id}
            className={`flex gap-3 rounded-lg border border-stone-200 p-3 ${
              lowConfidence ? "opacity-70" : ""
            }`}
          >
            <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-stone-100 text-2xl">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt=""
                  width={56}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>📕</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate font-medium text-stone-900">
                {book.canonicalTitle ?? book.title}
              </p>
              {(book.canonicalAuthor ?? book.author) && (
                <p className="truncate text-sm text-stone-500">
                  {book.canonicalAuthor ?? book.author}
                </p>
              )}
              <RatingStars average={book.averageRating} count={book.ratingsCount} />
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs ${STATUS_CLASSES[book.matchStatus]}`}
              >
                {STATUS_LABEL[book.matchStatus]}
                {lowConfidence ? " · low-confidence read" : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
