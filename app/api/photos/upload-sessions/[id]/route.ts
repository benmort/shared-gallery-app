import { NextResponse } from "next/server";
import { isUploadV2Enabled } from "@/lib/upload-config";
import { getUploadSessionStore } from "@/lib/upload-session-store";
import { ensureUploadAuthorized, ensureUploadRateLimit } from "@/lib/upload-security";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isUploadV2Enabled()) {
      return NextResponse.json({ error: "Upload sessions disabled" }, { status: 503 });
    }
    await ensureUploadAuthorized(request);
    ensureUploadRateLimit(request, "upload-session-read");
    const { id } = await context.params;
    const session = await getUploadSessionStore().get(id);
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read upload session";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : message.startsWith("Rate limited") ? 429 : 400 },
    );
  }
}
