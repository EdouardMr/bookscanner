import { NextResponse } from "next/server";
import { PreferencesSchema } from "@/lib/validation/schemas";
import { getDeviceId } from "@/lib/device/deviceId";
import { getPreferences, upsertPreferences } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const deviceId = await getDeviceId();
    const prefs = await getPreferences(deviceId);
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Failed to load preferences:", error);
    return NextResponse.json(
      { error: "Couldn't load saved preferences." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = PreferencesSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preferences.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const deviceId = await getDeviceId();
    await upsertPreferences(deviceId, parsed.data);
    return NextResponse.json(parsed.data);
  } catch (error) {
    console.error("Failed to save preferences:", error);
    return NextResponse.json(
      { error: "Couldn't save preferences." },
      { status: 500 }
    );
  }
}
