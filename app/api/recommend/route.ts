import { NextResponse } from "next/server";
import { RecommendRequestSchema } from "@/lib/validation/schemas";
import { recommend } from "@/lib/anthropic/recommend";
import { toHttpError } from "@/lib/anthropic/httpError";
import { getDeviceId } from "@/lib/device/deviceId";
import { saveScan } from "@/lib/db/queries";
import { captureError } from "@/lib/observability/captureError";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RecommendRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const deviceId = await getDeviceId();
    const result = await recommend(parsed.data.books, parsed.data.preferences, deviceId);

    // Persist to this device's reading history. A failure here shouldn't
    // hide a perfectly good recommendation from the user, so log and
    // continue rather than 500ing the whole request.
    try {
      await saveScan(deviceId, parsed.data.books, result);
    } catch (persistError) {
      console.error("Failed to save scan to history:", persistError);
      captureError(persistError, { scope: "save-scan", deviceId });
    }

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = toHttpError(error, "recommend");
    return NextResponse.json(body, { status });
  }
}
