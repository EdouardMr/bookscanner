import { z } from "zod";
import type { EnrichedBook, Preferences } from "@/lib/validation/schemas";

/**
 * Pure prompt-construction helpers, kept separate from the actual API calls
 * in extractBooks.ts / recommend.ts so they can be unit tested without
 * hitting the network.
 */

export const EXTRACT_SYSTEM_PROMPT = `You are looking at a photo of a bookshelf. Read every book spine you can
make out and report its title and (if legible or confidently inferable) its
author. Include partially-obscured or angled spines if you can still make a
reasonable guess — just give them a lower confidence score. Do not invent
books that aren't visible in the photo. If the photo contains no legible
book spines at all, return an empty list rather than guessing.`;

export const RECOMMEND_SYSTEM_PROMPT = `You are a book-recommendation assistant. You will be given a list of books
that are physically on someone's shelf right now, plus their stated reading
preferences. Pick the book(s) from that shelf that best match their taste.

Rules:
- You may only recommend books from the given shelf list, by their exact id.
  Never invent a book or recommend one that isn't on the shelf.
- Rank your picks (1 = best match). Usually 1-3 picks is right; don't rank
  the whole shelf unless it's very short.
- Every rationale must explicitly reference the specific preference field(s)
  (e.g. named genres, mood, a favorite author) that made this pick a good
  match. Generic praise ("it's a great book") is not acceptable on its own.
- If the reader's preferences are entirely empty/default, you have no taste
  signal to work with: fall back to the most broadly acclaimed book(s) on the
  shelf (by rating and ratings count) and say plainly in overallNote that
  this is a fallback because no preferences were given.
- If a book is unmatched (no external metadata found), you can still
  recommend it based on its title/author alone, but say so.`;

export interface ShelfSummaryEntry {
  id: string;
  title: string;
  author?: string;
  description?: string;
  averageRating?: number;
  ratingsCount?: number;
  subjects?: string[];
  firstPublishYear?: number;
  matchStatus: EnrichedBook["matchStatus"];
}

/** Strips a full EnrichedBook down to just what the recommendation prompt needs. */
export function buildShelfSummary(books: EnrichedBook[]): ShelfSummaryEntry[] {
  return books.map((b) => ({
    id: b.id,
    title: b.canonicalTitle ?? b.title,
    author: b.canonicalAuthor ?? b.author,
    description: b.description,
    averageRating: b.averageRating,
    ratingsCount: b.ratingsCount,
    subjects: b.subjects,
    firstPublishYear: b.firstPublishYear,
    matchStatus: b.matchStatus,
  }));
}

/** The user-turn content sent to the recommendation call. */
export function buildRecommendUserContent(
  books: EnrichedBook[],
  preferences: Preferences
): string {
  return JSON.stringify(
    { shelf: buildShelfSummary(books), preferences },
    null,
    2
  );
}

/**
 * Restricting `bookId` to a literal enum of the actual candidate ids means
 * the model is structurally incapable of returning an id that isn't on the
 * shelf — enforced by the JSON schema itself, not just prompting.
 */
export function buildRecommendResponseSchema(books: EnrichedBook[]) {
  if (books.length === 0) {
    throw new Error("buildRecommendResponseSchema requires at least one book");
  }
  const bookIds = books.map((b) => b.id) as [string, ...string[]];

  const RecommendationSchema = z.object({
    bookId: z.enum(bookIds),
    rank: z.number().int().min(1),
    rationale: z
      .string()
      .describe(
        "Must name the specific preference field(s) that drove this pick."
      ),
    confidenceNote: z.string().optional(),
  });

  return z.object({
    picks: z.array(RecommendationSchema).min(1),
    overallNote: z.string().optional(),
  });
}
