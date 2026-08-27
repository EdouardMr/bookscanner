import "server-only";
import type { DetectedBook } from "@/lib/validation/schemas";

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";
const TIMEOUT_MS = 8000;

// Plain OCR has no real basis for a confidence score the way the vision
// model does — this is a fixed, deliberately modest placeholder so
// downstream matching (lib/books/matching.ts) still treats these as
// lower-trust guesses than a real Claude extraction would produce.
const FALLBACK_CONFIDENCE = 0.35;
const MIN_LINE_LENGTH = 3;

interface VisionAnnotateResponse {
  responses?: Array<{
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string };
  }>;
}

/**
 * Fallback for extractBooks() when Claude's vision call can't be used (our
 * own rate limit, an Anthropic outage, an auth misconfiguration, ...).
 * Uses Google Cloud Vision's OCR (TEXT_DETECTION) instead of an LLM, which
 * is much lower quality: no title/author separation, no real confidence
 * signal, and no attempt to read multiple spines vs. one — it's just "one
 * line of raw detected text per candidate book". Good enough to keep the
 * app minimally usable during an outage, not a real substitute.
 *
 * Reuses GOOGLE_BOOKS_API_KEY (same Google Cloud project as
 * lib/books/googleBooks.ts) rather than a separate key, per the project's
 * convention of one Google Cloud API key for all Google services here.
 * Unlike the Books API, Vision has no unauthenticated tier, so this key
 * must have the Cloud Vision API enabled for the fallback to work — see
 * https://console.cloud.google.com/apis/library/vision.googleapis.com
 */
export async function extractBooksWithGoogleVision(
  imageBase64: string
): Promise<DetectedBook[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Google Vision fallback unavailable: GOOGLE_BOOKS_API_KEY is not set."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Google Vision API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as VisionAnnotateResponse;
    const result = data.responses?.[0];
    if (result?.error) {
      throw new Error(`Google Vision API error: ${result.error.message}`);
    }

    // textAnnotations[0] is the full detected text as one blob; the
    // remaining entries are individual words with bounding boxes, which
    // we'd need for real spine-by-spine grouping — out of scope for a
    // fallback path.
    const fullText = result?.textAnnotations?.[0]?.description ?? "";

    return fullText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length >= MIN_LINE_LENGTH)
      .map((line) => ({
        rawText: line,
        title: line,
        confidence: FALLBACK_CONFIDENCE,
      }));
  } finally {
    clearTimeout(timer);
  }
}
