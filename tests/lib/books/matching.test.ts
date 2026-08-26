import { describe, it, expect } from "vitest";
import {
  normalize,
  jaccard,
  scoreMatch,
  classifyScore,
  pickBestCandidate,
} from "@/lib/books/matching";

describe("normalize", () => {
  it("lowercases, strips accents and punctuation, and collapses whitespace", () => {
    expect(normalize("The Left Hand of Darkness!")).toBe(
      "the left hand of darkness"
    );
    expect(normalize("Café  Über-Book")).toBe("cafe uber book");
  });
});

describe("jaccard", () => {
  it("is 1 for identical strings", () => {
    expect(jaccard("Dune", "dune")).toBe(1);
  });

  it("is 0 for completely disjoint strings", () => {
    expect(jaccard("Dune", "The Hobbit")).toBe(0);
  });

  it("is partial for overlapping-but-different titles", () => {
    const score = jaccard("The Left Hand of Darkness", "Left Hand");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("scoreMatch", () => {
  it("uses title only when either side lacks an author", () => {
    const score = scoreMatch(
      { title: "Dune" },
      { title: "Dune", author: "Frank Herbert" }
    );
    expect(score).toBe(1);
  });

  it("blends title and author when both are present", () => {
    const exactBoth = scoreMatch(
      { title: "Dune", author: "Frank Herbert" },
      { title: "Dune", author: "Frank Herbert" }
    );
    const wrongAuthor = scoreMatch(
      { title: "Dune", author: "Someone Else" },
      { title: "Dune", author: "Frank Herbert" }
    );
    expect(exactBoth).toBe(1);
    expect(wrongAuthor).toBeLessThan(exactBoth);
  });
});

describe("classifyScore", () => {
  it("classifies scores into matched/ambiguous/unmatched bands", () => {
    expect(classifyScore(0.9)).toBe("matched");
    expect(classifyScore(0.5)).toBe("matched");
    expect(classifyScore(0.3)).toBe("ambiguous");
    expect(classifyScore(0.1)).toBe("unmatched");
    expect(classifyScore(0)).toBe("unmatched");
  });
});

describe("pickBestCandidate", () => {
  it("returns null for an empty candidate list", () => {
    expect(pickBestCandidate({ title: "Dune" }, [])).toBeNull();
  });

  it("picks the closest-matching candidate by score", () => {
    const result = pickBestCandidate({ title: "Dune", author: "Frank Herbert" }, [
      { title: "Dune Messiah", author: "Frank Herbert" },
      { title: "Dune", author: "Frank Herbert" },
      { title: "The Hobbit", author: "J.R.R. Tolkien" },
    ]);
    expect(result?.candidate.title).toBe("Dune");
    expect(result?.score).toBe(1);
  });
});
