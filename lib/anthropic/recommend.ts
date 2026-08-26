import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, ANTHROPIC_MODEL } from "./client";
import {
  RECOMMEND_SYSTEM_PROMPT,
  buildRecommendUserContent,
  buildRecommendResponseSchema,
} from "./prompts";
import type { EnrichedBook, Preferences, RecommendResponse } from "@/lib/validation/schemas";

export async function recommend(
  books: EnrichedBook[],
  preferences: Preferences
): Promise<RecommendResponse> {
  if (books.length === 0) {
    throw new Error("recommend() requires at least one candidate book");
  }

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

  return (
    message.parsed_output ?? {
      picks: [],
      overallNote: "The model did not return a parseable recommendation.",
    }
  );
}
