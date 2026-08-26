import { createHash } from "node:crypto";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, ANTHROPIC_MODEL } from "./client";
import { EXTRACT_SYSTEM_PROMPT } from "./prompts";
import { enforceRateLimit } from "./rateLimit";
import { TtlCache } from "./cache";
import { DetectedBookListSchema, type DetectedBook } from "@/lib/validation/schemas";

export interface ExtractBooksInput {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

// Short TTL: this only exists to absorb retries/double-submits of the same
// photo, not as durable storage. The key is a one-way hash of the image
// bytes, never the image itself — consistent with never persisting photos.
const EXTRACT_CACHE_TTL_MS = 10 * 60_000;
const extractCache = new TtlCache<DetectedBook[]>(EXTRACT_CACHE_TTL_MS);

export async function extractBooks({
  imageBase64,
  mediaType,
}: ExtractBooksInput): Promise<DetectedBook[]> {
  const cacheKey = createHash("sha256")
    .update(mediaType)
    .update(imageBase64)
    .digest("hex");

  const cached = extractCache.get(cacheKey);
  if (cached) return cached;

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

  const books = message.parsed_output?.books ?? [];
  extractCache.set(cacheKey, books);
  return books;
}
