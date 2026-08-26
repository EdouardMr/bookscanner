import "server-only";
import { randomUUID } from "crypto";
import type { DetectedBook, EnrichedBook } from "@/lib/validation/schemas";
import { searchOpenLibrary, fetchOpenLibraryDescription } from "./openLibrary";
import { searchGoogleBooks } from "./googleBooks";
import { pickBestCandidate, classifyScore } from "./matching";

/**
 * Tries Open Library first (no key needed), falls back to Google Books, and
 * settles for `unmatched` (raw detected title/author, no cover/rating)
 * rather than dropping the book — every detected spine should still make it
 * into the recommendation step even with no metadata match.
 */
export async function enrichBook(detected: DetectedBook): Promise<EnrichedBook> {
  const id = randomUUID();

  try {
    const candidates = await searchOpenLibrary(detected.title, detected.author);
    const best = pickBestCandidate(detected, candidates);
    if (best) {
      const matchStatus = classifyScore(best.score);
      if (matchStatus !== "unmatched") {
        const description = best.candidate.workKey
          ? await fetchOpenLibraryDescription(best.candidate.workKey)
          : undefined;

        return {
          ...detected,
          id,
          matchStatus,
          source: "openlibrary",
          canonicalTitle: best.candidate.title,
          canonicalAuthor: best.candidate.author,
          coverUrl: best.candidate.coverUrl,
          description,
          averageRating: best.candidate.averageRating,
          ratingsCount: best.candidate.ratingsCount,
          subjects: best.candidate.subjects,
          firstPublishYear: best.candidate.firstPublishYear,
        };
      }
    }
  } catch {
    // Open Library unreachable/errored — fall through to Google Books.
  }

  try {
    const candidates = await searchGoogleBooks(detected.title, detected.author);
    const best = pickBestCandidate(detected, candidates);
    if (best) {
      const matchStatus = classifyScore(best.score);
      if (matchStatus !== "unmatched") {
        return {
          ...detected,
          id,
          matchStatus,
          source: "googlebooks",
          canonicalTitle: best.candidate.title,
          canonicalAuthor: best.candidate.author,
          coverUrl: best.candidate.coverUrl,
          description: best.candidate.description,
          averageRating: best.candidate.averageRating,
          ratingsCount: best.candidate.ratingsCount,
          subjects: best.candidate.subjects,
          firstPublishYear: best.candidate.firstPublishYear,
        };
      }
    }
  } catch {
    // Google Books unreachable/errored — fall through to unmatched.
  }

  return { ...detected, id, matchStatus: "unmatched", source: "none" };
}

/**
 * Runs all enrichments in parallel via allSettled so one slow/failed lookup
 * never blocks the rest of the shelf; a rejection (which shouldn't normally
 * happen given enrichBook's own try/catch) still degrades to an unmatched
 * entry rather than losing the book.
 */
export async function enrichBooks(
  detectedBooks: DetectedBook[]
): Promise<EnrichedBook[]> {
  const settled = await Promise.allSettled(detectedBooks.map(enrichBook));

  return settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    return {
      ...detectedBooks[index],
      id: randomUUID(),
      matchStatus: "unmatched" as const,
      source: "none" as const,
    };
  });
}
