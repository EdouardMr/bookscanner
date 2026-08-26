import { z } from "zod";

/**
 * A single book the vision model claims to have read off a spine in the
 * uploaded shelf photo. This is the *raw* extraction, before any attempt to
 * match it against a real book-metadata source.
 */
export const DetectedBookSchema = z.object({
  rawText: z
    .string()
    .describe("The exact text visible on the spine, as read by the model."),
  title: z.string().min(1).describe("Best guess at the book's title."),
  author: z
    .string()
    .optional()
    .describe("Best guess at the author, if legible or inferable."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1 confidence that this title/author guess is correct."),
});
export type DetectedBook = z.infer<typeof DetectedBookSchema>;

/** Shape the vision call is asked to return: a flat list of detected books. */
export const DetectedBookListSchema = z.object({
  books: z.array(DetectedBookSchema),
});
export type DetectedBookList = z.infer<typeof DetectedBookListSchema>;

export const MATCH_STATUSES = ["matched", "ambiguous", "unmatched"] as const;
export const BOOK_SOURCES = ["openlibrary", "googlebooks", "none"] as const;

/**
 * A detected book after the enrichment step has tried to match it against
 * Open Library / Google Books. Always has an `id`, assigned server-side, so
 * downstream steps (preferences, recommendation) can refer to a book
 * unambiguously even when title/author guesses are shaky.
 */
export const EnrichedBookSchema = DetectedBookSchema.extend({
  id: z.string(),
  matchStatus: z.enum(MATCH_STATUSES),
  source: z.enum(BOOK_SOURCES),
  canonicalTitle: z.string().optional(),
  canonicalAuthor: z.string().optional(),
  coverUrl: z.string().optional(),
  description: z.string().optional(),
  averageRating: z.number().min(0).max(5).optional(),
  ratingsCount: z.number().int().min(0).optional(),
  subjects: z.array(z.string()).optional(),
  firstPublishYear: z.number().int().optional(),
});
export type EnrichedBook = z.infer<typeof EnrichedBookSchema>;

export const ScanResponseSchema = z.object({
  books: z.array(EnrichedBookSchema),
  warnings: z.array(z.string()).optional(),
});
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

export const MOODS = [
  "cozy",
  "thrilling",
  "thought-provoking",
  "light-funny",
  "dark-intense",
  "uplifting",
] as const;

export const LENGTH_PREFERENCES = [
  "short",
  "medium",
  "long",
  "no-preference",
] as const;

export const GENRE_OPTIONS = [
  "Fiction",
  "Mystery/Thriller",
  "Sci-Fi",
  "Fantasy",
  "Romance",
  "Non-fiction",
  "Biography",
  "Self-help",
  "History",
  "Literary Fiction",
  "YA",
  "Horror",
  "Poetry",
] as const;

/**
 * Everything here is optional and defaults to empty/unset — a user is free
 * to skip preferences entirely and still get a recommendation (the
 * recommendation prompt falls back to "most broadly acclaimed" in that case).
 */
export const PreferencesSchema = z.object({
  genres: z.array(z.string()).default([]),
  favoriteAuthors: z.array(z.string()).default([]),
  favoriteBooks: z.array(z.string()).default([]),
  mood: z.enum(MOODS).optional(),
  lengthPreference: z.enum(LENGTH_PREFERENCES).default("no-preference"),
  additionalNotes: z.string().max(1000).optional(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const EMPTY_PREFERENCES: Preferences = {
  genres: [],
  favoriteAuthors: [],
  favoriteBooks: [],
  lengthPreference: "no-preference",
};

/** One ranked pick from the recommendation call. `bookId` must be one of the
 * ids in the shelf list it was given — this is enforced by building a
 * request-specific zod schema with `bookId` restricted to a literal union of
 * the actual candidate ids (see lib/anthropic/recommend.ts), not just here. */
export const RecommendationSchema = z.object({
  bookId: z.string(),
  rank: z.number().int().min(1),
  rationale: z
    .string()
    .describe(
      "Why this book matches the reader's stated preferences. Must reference specific preference fields by name."
    ),
  confidenceNote: z.string().optional(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const RecommendResponseSchema = z.object({
  picks: z.array(RecommendationSchema),
  overallNote: z
    .string()
    .optional()
    .describe(
      "Optional overall context, e.g. explaining a fallback when preferences were empty."
    ),
});
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

export const RecommendRequestSchema = z.object({
  books: z.array(EnrichedBookSchema).min(1),
  preferences: PreferencesSchema,
});
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

export const ScanRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

/** One saved scan in a device's reading history. */
export const ScanHistoryEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  detectedBooks: z.array(EnrichedBookSchema),
  recommendation: RecommendResponseSchema,
});
export type ScanHistoryEntry = z.infer<typeof ScanHistoryEntrySchema>;
