import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and fill in a key."
  );
}

export const anthropic = new Anthropic({ apiKey });

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
