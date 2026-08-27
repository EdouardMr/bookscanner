import { createHash } from "node:crypto";
import { BadRequestError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, ANTHROPIC_MODEL } from "./client";
import { EXTRACT_SYSTEM_PROMPT } from "./prompts";
import { enforceRateLimit } from "./rateLimit";
import { TtlCache } from "./cache";
import { extractBooksWithGoogleVision } from "@/lib/google/visionFallback";
import { DetectedBookListSchema, type DetectedBook } from "@/lib/validation/schemas";

export interface ExtractBooksInput {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ExtractBooksResult {
  books: DetectedBook[];
  /** Which engine actually produced `books` — lets callers warn the user
   * when the lower-quality fallback path was used. */
  source: "claude" | "google-vision";
}

// Short TTL: this only exists to absorb retries/double-submits of the same
// photo, not as durable storage. The key is a one-way hash of the image
// bytes, never the image itself — consistent with never persisting photos.
const EXTRACT_CACHE_TTL_MS = 10 * 60_000;
const extractCache = new TtlCache<ExtractBooksResult>(EXTRACT_CACHE_TTL_MS);

export async function extractBooks({
  imageBase64,
  mediaType,
}: ExtractBooksInput): Promise<ExtractBooksResult> {
  const cacheKey = createHash("sha256")
    .update(mediaType)
    .update(imageBase64)
    .digest("hex");

  const cached = extractCache.get(cacheKey);
  if (cached) return cached;

  let result: ExtractBooksResult;
  try {
    enforceRateLimit();

    const message = await anthropic.messages.parse({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "List every book you can identify on this shelf.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(DetectedBookListSchema),
      },
    });

    result = { books: message.parsed_output?.books ?? [], source: "claude" };
  } catch (error) {
    // A bad photo is a photo problem, not a Claude-availability problem —
    // a different vision engine won't salvage it, so don't bother falling
    // back and let the caller's normal error handling take over.
    if (error instanceof BadRequestError) {
      throw error;
    }

    console.error(
      "Claude vision extraction unavailable, falling back to Google Vision:",
      error
    );
    try {
      const books = await extractBooksWithGoogleVision(imageBase64);
      result = { books, source: "google-vision" };
    } catch (fallbackError) {
      console.error("Google Vision fallback also failed:", fallbackError);
      // Surface the original Claude error — it's the more meaningful one
      // for the caller/user to see (httpError.ts knows how to map it).
      throw error;
    }
  }

  extractCache.set(cacheKey, result);
  return result;
}
