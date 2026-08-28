import { describe, it, expect, vi, beforeEach } from "vitest";

const captureExceptionMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

// Imported after the mock so captureError.ts picks up the mocked module.
const { captureError } = await import("@/lib/observability/captureError");

describe("captureError", () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
  });

  it("tags errorType from the error's constructor name", () => {
    class CustomError extends Error {}
    const error = new CustomError("boom");

    captureError(error, { scope: "extract" });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { scope: "extract", errorType: "CustomError" },
      })
    );
  });

  it("falls back to typeof for a non-Error thrown value", () => {
    captureError("not an error object", { scope: "history" });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      "not an error object",
      expect.objectContaining({
        tags: { scope: "history", errorType: "string" },
      })
    );
  });

  it("passes deviceId through as the Sentry user id when provided", () => {
    captureError(new Error("boom"), { scope: "save-scan", deviceId: "device-123" });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ user: { id: "device-123" } })
    );
  });

  it("omits the user field when no deviceId is given", () => {
    captureError(new Error("boom"), { scope: "preferences" });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ user: undefined })
    );
  });

  it("forwards extra context untouched", () => {
    captureError(new Error("boom"), {
      scope: "rate-limit",
      extra: { rateLimitScope: "recommend" },
    });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ extra: { rateLimitScope: "recommend" } })
    );
  });
});
