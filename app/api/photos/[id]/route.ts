import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
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
