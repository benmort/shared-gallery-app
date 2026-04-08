import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import { isAllowedImageType, MAX_FILE_BYTES } from "@/lib/types/photo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await getPhotoStorage().list();
    return NextResponse.json(photos);
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
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds maximum size` },
          { status: 400 },
        );
      }
      const mime = file.type || "application/octet-stream";
      if (!isAllowedImageType(mime)) {
        return NextResponse.json(
          { error: `Unsupported type for "${file.name}"` },
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
      message === "Unsupported image type" || message === "File too large"
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
