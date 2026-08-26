"use client";

// Matches roughly what Claude's vision pipeline downsizes to internally, so
// sending a larger image just costs bandwidth/tokens with no accuracy gain.
const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.8;
// Ceiling on the base64 payload itself (Vercel Route Handlers have a body
// size limit) — this is the client-side backstop the plan calls for.
const MAX_BASE64_CHARS = 4 * 1024 * 1024;

export class ImageTooLargeError extends Error {
  constructor() {
    super(
      "This photo is too large even after compression. Try taking it in better lighting, or a bit further from the shelf."
    );
    this.name = "ImageTooLargeError";
  }
}

export interface ResizedImage {
  base64: string;
  mediaType: "image/jpeg";
}

/** Downscales + re-encodes a photo client-side before it's sent to the server. */
export async function resizeImageFile(file: File): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable in this browser.");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1] ?? "";

  if (base64.length > MAX_BASE64_CHARS) {
    throw new ImageTooLargeError();
  }

  return { base64, mediaType: "image/jpeg" };
}
