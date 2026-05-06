import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import { isAllowedMediaType, maxBytesForMime } from "@/lib/types/photo";
import { classifyUploadError, safeErrorMessage } from "@/lib/upload-errors";
import { logUploadEvent } from "@/lib/upload-logging";
import { ensureUploadAuthorized, ensureUploadRateLimit } from "@/lib/upload-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const u = new URL(request.url);
    const ids = (u.searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) {
      const storage = getPhotoStorage();
      if (!storage.listByIds) {
        const photos = await storage.list();
        const byId = new Map(photos.map((p) => [p.id, p]));
        return NextResponse.json(ids.map((id) => byId.get(id)).filter(Boolean));
      }
      const photos = await storage.listByIds(ids);
      return NextResponse.json(photos);
    }
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
    await ensureUploadAuthorized(request);
    ensureUploadRateLimit(request, "multipart-upload");
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
    const message = safeErrorMessage(e, "Upload failed");
    const cls = classifyUploadError(e);
    logUploadEvent(
      "multipart-upload.failed",
      {
        error: message,
        class: cls,
      },
      "warn",
    );
    const status =
      message === "Unsupported media type" || message === "File too large"
        ? 400
        : message === "Unauthorized"
          ? 401
          : message.startsWith("Rate limited")
            ? 429
            : 500;
    return NextResponse.json({ error: message, class: cls }, { status });
  }
}
