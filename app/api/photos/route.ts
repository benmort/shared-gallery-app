import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import { isAllowedMediaType, maxBytesForMime } from "@/lib/types/photo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const u = new URL(request.url);
    const hasPaged =
      u.searchParams.has("offset") || u.searchParams.has("limit");
    if (!hasPaged) {
      const photos = await getPhotoStorage().list();
      return NextResponse.json(photos);
    }
    const offset = Math.max(0, parseInt(u.searchParams.get("offset") || "0", 10) || 0);
    const limitRaw = parseInt(u.searchParams.get("limit") || "48", 10);
    const limit = Math.min(Math.max(1, limitRaw || 48), 100);
    const { photos, total } = await getPhotoStorage().listPaged(offset, limit);
    return NextResponse.json({ photos, total, offset, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list photos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entries = formData.getAll("file") as File[];
    if (!entries.length) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const storage = getPhotoStorage();
    const created: Awaited<ReturnType<typeof storage.createFromBuffer>>[] = [];

    for (const file of entries) {
      if (!(file instanceof File) || file.size === 0) continue;
      const mime = file.type || "application/octet-stream";
      if (!isAllowedMediaType(mime)) {
        return NextResponse.json(
          { error: `Unsupported type for "${file.name}"` },
          { status: 400 },
        );
      }
      const maxBytes = maxBytesForMime(mime);
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds maximum size` },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const photo = await storage.createFromBuffer({
        buffer,
        filename: file.name,
        mime,
      });
      created.push(photo);
    }

    if (!created.length) {
      return NextResponse.json({ error: "No valid files uploaded" }, { status: 400 });
    }

    return NextResponse.json({ photos: created });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status =
      message === "Unsupported media type" || message === "File too large"
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
