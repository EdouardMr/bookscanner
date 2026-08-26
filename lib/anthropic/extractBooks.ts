import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, ANTHROPIC_MODEL } from "./client";
import { EXTRACT_SYSTEM_PROMPT } from "./prompts";
import { DetectedBookListSchema, type DetectedBook } from "@/lib/validation/schemas";

export interface ExtractBooksInput {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export async function extractBooks({
  imageBase64,
  mediaType,
}: ExtractBooksInput): Promise<DetectedBook[]> {
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

  return message.parsed_output?.books ?? [];
}
