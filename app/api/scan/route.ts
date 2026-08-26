import { NextResponse } from "next/server";
import { ScanRequestSchema, type ScanResponse } from "@/lib/validation/schemas";
import { extractBooks } from "@/lib/anthropic/extractBooks";
import { enrichBooks } from "@/lib/books/enrich";
import { toHttpError } from "@/lib/anthropic/httpError";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ScanRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const { books: detected, source } = await extractBooks(parsed.data);
    const warnings: string[] = [];
    if (source === "google-vision") {
      warnings.push(
        "The AI reader was unavailable, so we fell back to basic text recognition — results may be less accurate than usual."
      );
    }

    if (detected.length === 0) {
      const response: ScanResponse = {
        books: [],
        warnings: [
          ...warnings,
          "Couldn't make out any book titles in that photo — try a closer, well-lit shot straight-on to the spines.",
        ],
      };
      return NextResponse.json(response);
    }

    const books = await enrichBooks(detected);
    const response: ScanResponse = {
      books,
      ...(warnings.length > 0 && { warnings }),
    };
    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toHttpError(error);
    return NextResponse.json(body, { status });
  }
}
