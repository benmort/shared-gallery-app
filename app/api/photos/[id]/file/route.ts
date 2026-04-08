import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const data = await getPhotoStorage().readFile(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data.buffer), {
    status: 200,
    headers: {
      "Content-Type": data.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
