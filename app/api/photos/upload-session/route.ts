import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import { isAllowedMediaType, maxBytesForMime } from "@/lib/types/photo";
import { UploadError, uploadErrorResponse } from "@/lib/upload/errors";
import { newCorrelationId, trackUploadEvent } from "@/lib/upload/observability";

export const dynamic = "force-dynamic";

type Body = {
  uploadId?: string;
  filename?: string;
  mime?: string;
  size?: number;
};

export async function POST(request: Request) {
  const correlationId = newCorrelationId();
  try {
    const body = (await request.json()) as Body;
    const uploadId = body.uploadId || crypto.randomUUID();
    const mime = (body.mime || "").toLowerCase();
    const size = typeof body.size === "number" ? body.size : 0;
    const filename = body.filename || "";
    if (!mime || !isAllowedMediaType(mime)) {
      throw new UploadError({
        code: "VALIDATION_ERROR",
        message: "Unsupported media type",
        status: 400,
      });
    }
    const maxBytes = maxBytesForMime(mime);
    if (size > maxBytes) {
      throw new UploadError({
        code: "VALIDATION_ERROR",
        message: `File exceeds maximum size (${Math.round(maxBytes / (1024 * 1024))} MB).`,
        status: 400,
      });
    }
    const storage = getPhotoStorage();
    const session = storage.initUploadSession
      ? await storage.initUploadSession({ uploadId, filename, mime, size })
      : { uploadId, pathname: `album-img/${uploadId}.${mime.split("/")[1] || "bin"}` };
    await trackUploadEvent({
      uploadId,
      event: "upload_init",
      correlationId,
      payload: {
        filename,
        mime,
        size,
      },
    });
    return NextResponse.json({
      uploadId: session.uploadId,
      pathname: session.pathname,
      maxBytes,
      correlationId,
    });
  } catch (error) {
    const err = uploadErrorResponse(error);
    return NextResponse.json(err.body, { status: err.status });
  }
}
