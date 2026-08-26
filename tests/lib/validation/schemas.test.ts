import { describe, it, expect } from "vitest";
import {
  DetectedBookSchema,
  PreferencesSchema,
  ScanRequestSchema,
  EnrichedBookSchema,
} from "@/lib/validation/schemas";

describe("DetectedBookSchema", () => {
  it("accepts a valid detection", () => {
    const result = DetectedBookSchema.safeParse({
      rawText: "Dune - Frank Herbert",
      title: "Dune",
      author: "Frank Herbert",
      confidence: 0.8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence outside 0-1", () => {
    const result = DetectedBookSchema.safeParse({
      rawText: "Dune",
      title: "Dune",
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("requires a non-empty title", () => {
    const result = DetectedBookSchema.safeParse({
      rawText: "???",
      title: "",
      confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("PreferencesSchema", () => {
  it("defaults every field so an empty object is valid", () => {
    const result = PreferencesSchema.parse({});
    expect(result).toEqual({
      genres: [],
      favoriteAuthors: [],
      favoriteBooks: [],
      lengthPreference: "no-preference",
    });
  });

  it("rejects an invalid mood", () => {
    const result = PreferencesSchema.safeParse({ mood: "grumpy" });
    expect(result.success).toBe(false);
  });
});

describe("ScanRequestSchema", () => {
  it("rejects an unsupported media type", () => {
    const result = ScanRequestSchema.safeParse({
      imageBase64: "abc",
      mediaType: "image/gif",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a supported media type", () => {
    const result = ScanRequestSchema.safeParse({
      imageBase64: "abc",
      mediaType: "image/jpeg",
    });
    expect(result.success).toBe(true);
  });
});

describe("EnrichedBookSchema", () => {
  it("requires id, matchStatus and source on top of the detected fields", () => {
    const missingFields = EnrichedBookSchema.safeParse({
      rawText: "Dune",
      title: "Dune",
      confidence: 0.8,
    });
    expect(missingFields.success).toBe(false);

    const complete = EnrichedBookSchema.safeParse({
      rawText: "Dune",
      title: "Dune",
      confidence: 0.8,
      id: "abc",
      matchStatus: "unmatched",
      source: "none",
    });
    expect(complete.success).toBe(true);
  });
});
