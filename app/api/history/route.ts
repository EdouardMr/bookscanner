import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device/deviceId";
import { listScans } from "@/lib/db/queries";
import { captureError } from "@/lib/observability/captureError";

export const runtime = "nodejs";

export async function GET() {
  try {
    const deviceId = await getDeviceId();
    const scans = await listScans(deviceId);
    return NextResponse.json({ scans });
  } catch (error) {
    console.error("Failed to load history:", error);
    captureError(error, { scope: "history" });
    return NextResponse.json(
      { error: "Couldn't load reading history." },
      { status: 500 }
    );
  }
}
