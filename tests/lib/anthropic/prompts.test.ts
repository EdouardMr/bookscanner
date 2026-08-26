import { describe, it, expect } from "vitest";
import {
  buildShelfSummary,
  buildRecommendUserContent,
  buildRecommendResponseSchema,
} from "@/lib/anthropic/prompts";
import { EMPTY_PREFERENCES, type EnrichedBook } from "@/lib/validation/schemas";

const books: EnrichedBook[] = [
  {
    id: "book-1",
    rawText: "Dune",
    title: "Dune",
    author: "Frank Herbert",
    confidence: 0.9,
    matchStatus: "matched",
    source: "openlibrary",
    canonicalTitle: "Dune",
    canonicalAuthor: "Frank Herbert",
    averageRating: 4.5,
    ratingsCount: 1000,
  },
  {
    id: "book-2",
    rawText: "Some Unmatched Book",
    title: "Some Unmatched Book",
    confidence: 0.4,
    matchStatus: "unmatched",
    source: "none",
  },
];

describe("buildShelfSummary", () => {
  it("prefers canonical title/author when available, falls back to raw detection", () => {
    const summary = buildShelfSummary(books);

    expect(summary[0]).toMatchObject({
      id: "book-1",
      title: "Dune",
      author: "Frank Herbert",
      matchStatus: "matched",
    });
    expect(summary[1]).toMatchObject({
      id: "book-2",
      title: "Some Unmatched Book",
      matchStatus: "unmatched",
    });
    expect(summary[1].author).toBeUndefined();
  });
});

describe("buildRecommendUserContent", () => {
  it("embeds both the shelf and the preferences as JSON", () => {
    const content = buildRecommendUserContent(books, {
      ...EMPTY_PREFERENCES,
      genres: ["Sci-Fi"],
      mood: "thrilling",
    });

    const parsed = JSON.parse(content) as {
      shelf: unknown[];
      preferences: { genres: string[]; mood?: string };
    };

    expect(parsed.shelf).toHaveLength(2);
    expect(parsed.preferences.genres).toEqual(["Sci-Fi"]);
    expect(parsed.preferences.mood).toBe("thrilling");
    expect(content).toContain("Dune");
  });
});

describe("buildRecommendResponseSchema", () => {
  it("restricts bookId to the given shelf's ids", () => {
    const schema = buildRecommendResponseSchema(books);

    const valid = schema.safeParse({
      picks: [{ bookId: "book-1", rank: 1, rationale: "Matches your Sci-Fi genre pick." }],
    });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({
      picks: [{ bookId: "not-on-the-shelf", rank: 1, rationale: "Nope." }],
    });
    expect(invalid.success).toBe(false);
  });

  it("throws when given an empty shelf", () => {
    expect(() => buildRecommendResponseSchema([])).toThrow();
  });
});
