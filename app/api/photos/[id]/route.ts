import { NextResponse } from "next/server";
import { isModerationConfigured } from "@/lib/moderation-auth";
import { readModerationCookie } from "@/lib/server-moderation";
import { getPhotoStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    if (!isModerationConfigured()) {
      return NextResponse.json(
        { error: "Moderation is not configured on this server" },
        { status: 503 },
      );
    }
    const allowed = await readModerationCookie();
    if (!allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const removed = await getPhotoStorage().deleteById(id);
    if (!removed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
