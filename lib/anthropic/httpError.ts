import {
  BadRequestError,
  AuthenticationError,
  RateLimitError,
  APIConnectionError,
} from "@anthropic-ai/sdk";

/**
 * Maps an error thrown from an Anthropic API call to an HTTP status + safe
 * client-facing message, checked most-specific-first. Anything not one of
 * these known types is treated as an unexpected 500.
 */
export function toHttpError(error: unknown): {
  status: number;
  body: { error: string };
} {
  if (error instanceof BadRequestError) {
    return {
      status: 400,
      body: { error: "That photo couldn't be processed — please retake it." },
    };
  }
  if (error instanceof AuthenticationError) {
    // Never leak key/config details to the client.
    console.error("Anthropic authentication error:", error);
    return {
      status: 500,
      body: { error: "Server misconfiguration. Please try again later." },
    };
  }
  if (error instanceof RateLimitError) {
    return {
      status: 503,
      body: { error: "The AI is busy right now — please try again shortly." },
    };
  }
  if (error instanceof APIConnectionError) {
    return {
      status: 503,
      body: {
        error: "Network hiccup reaching the AI service — please try again.",
      },
    };
  }

  console.error("Unexpected error calling Anthropic:", error);
  return {
    status: 500,
    body: { error: "Something went wrong. Please try again." },
  };
}
