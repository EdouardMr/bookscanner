import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enrichBook, enrichBooks } from "@/lib/books/enrich";
import type { DetectedBook } from "@/lib/validation/schemas";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

const detected: DetectedBook = {
  rawText: "Dune - Frank Herbert",
  title: "Dune",
  author: "Frank Herbert",
  confidence: 0.9,
};

describe("enrichBook", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches via Open Library and fetches its description", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("openlibrary.org/search.json")) {
        return jsonResponse({
          docs: [
            {
              title: "Dune",
              author_name: ["Frank Herbert"],
              cover_i: 12345,
              ratings_average: 4.5,
              ratings_count: 1000,
              first_publish_year: 1965,
              subject: ["Science fiction"],
              key: "/works/OL123W",
            },
          ],
        });
      }
      if (url.includes("/works/OL123W.json")) {
        return jsonResponse({ description: "A desert planet epic." });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await enrichBook(detected);

    expect(result.matchStatus).toBe("matched");
    expect(result.source).toBe("openlibrary");
    expect(result.canonicalTitle).toBe("Dune");
    expect(result.description).toBe("A desert planet epic.");
    expect(result.averageRating).toBe(4.5);
    expect(result.coverUrl).toContain("12345");
  });

  it("falls back to Google Books when Open Library has no good match", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("openlibrary.org/search.json")) {
        return jsonResponse({ docs: [] });
      }
      if (url.includes("googleapis.com/books/v1/volumes")) {
        return jsonResponse({
          items: [
            {
              volumeInfo: {
                title: "Dune",
                authors: ["Frank Herbert"],
                description: "Google's description.",
                averageRating: 4.7,
                ratingsCount: 500,
                categories: ["Fiction"],
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await enrichBook(detected);

    expect(result.matchStatus).toBe("matched");
    expect(result.source).toBe("googlebooks");
    expect(result.description).toBe("Google's description.");
  });

  it("returns unmatched with no external metadata when nothing matches anywhere", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("openlibrary.org")) return jsonResponse({ docs: [] });
      if (url.includes("googleapis.com")) return jsonResponse({ items: [] });
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await enrichBook(detected);

    expect(result.matchStatus).toBe("unmatched");
    expect(result.source).toBe("none");
    expect(result.coverUrl).toBeUndefined();
    expect(result.title).toBe("Dune");
  });

  it("falls through to Google Books when Open Library itself errors", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("openlibrary.org")) throw new Error("network down");
      if (url.includes("googleapis.com")) {
        return jsonResponse({
          items: [{ volumeInfo: { title: "Dune", authors: ["Frank Herbert"] } }],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await enrichBook(detected);

    expect(result.matchStatus).toBe("matched");
    expect(result.source).toBe("googlebooks");
  });
});

describe("enrichBooks", () => {
  it("keeps every book (as unmatched) even if every lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const books: DetectedBook[] = [
      { rawText: "A", title: "Book A", confidence: 0.8 },
      { rawText: "B", title: "Book B", confidence: 0.6 },
    ];

    const results = await enrichBooks(books);

    expect(results).toHaveLength(2);
    expect(results.every((b) => b.matchStatus === "unmatched")).toBe(true);
    expect(results.map((b) => b.title)).toEqual(["Book A", "Book B"]);

    vi.unstubAllGlobals();
  });
});
