import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, ANTHROPIC_MODEL } from "./client";
import {
  RECOMMEND_SYSTEM_PROMPT,
  buildRecommendUserContent,
  buildRecommendResponseSchema,
} from "./prompts";
import { enforceRateLimit } from "./rateLimit";
import { TtlCache } from "./cache";
import type { EnrichedBook, Preferences, RecommendResponse } from "@/lib/validation/schemas";

// Generous TTL: (shelf, preferences) fully determines the recommendation,
// so a cache hit isn't just a cost saving — it also makes revisiting the
// same result consistent instead of re-rolling the model.
const RECOMMEND_CACHE_TTL_MS = 60 * 60_000;
const recommendCache = new TtlCache<RecommendResponse>(RECOMMEND_CACHE_TTL_MS);

/**
 * Deterministic cache key for a (shelf, preferences) pair. Book ids are
 * sorted so submission order doesn't matter; preference arrays are sorted
 * too since e.g. genre order isn't semantically meaningful.
 */
function buildCacheKey(books: EnrichedBook[], preferences: Preferences): string {
  const bookIds = books.map((b) => b.id).sort().join(",");
  const preferencesKey = JSON.stringify({
    genres: [...preferences.genres].sort(),
    favoriteAuthors: [...preferences.favoriteAuthors].sort(),
    favoriteBooks: [...preferences.favoriteBooks].sort(),
    mood: preferences.mood ?? null,
    lengthPreference: preferences.lengthPreference,
    additionalNotes: preferences.additionalNotes ?? null,
  });
  return `${bookIds}|${preferencesKey}`;
}

export async function recommend(
  books: EnrichedBook[],
  preferences: Preferences
): Promise<RecommendResponse> {
  if (books.length === 0) {
    throw new Error("recommend() requires at least one candidate book");
  }

  const cacheKey = buildCacheKey(books, preferences);
  const cached = recommendCache.get(cacheKey);
  if (cached) return cached;

  enforceRateLimit();

  const responseSchema = buildRecommendResponseSchema(books);

  const message = await anthropic.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: RECOMMEND_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildRecommendUserContent(books, preferences),
      },
    ],
    output_config: {
      format: zodOutputFormat(responseSchema),
    },
  });

  const result = message.parsed_output ?? {
    picks: [],
    overallNote: "The model did not return a parseable recommendation.",
  };
  recommendCache.set(cacheKey, result);
  return result;
}
