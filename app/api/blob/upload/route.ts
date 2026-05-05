import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import {
  isAllowedMediaType,
  maxBytesForMime,
} from "@/lib/types/photo";
import { UploadError, uploadErrorResponse } from "@/lib/upload/errors";
import { trackUploadEvent } from "@/lib/upload/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("album-img/")) {
          throw new UploadError({
            code: "VALIDATION_ERROR",
            message: "Invalid pathname",
            status: 400,
          });
        }
        let uploadId = "";
        let size = 0;
        let mime = "";
        let filename = "";
        if (clientPayload) {
          try {
            const p = JSON.parse(clientPayload) as {
              uploadId?: string;
              filename?: string;
              mime?: string;
              size?: number;
            };
            uploadId = p.uploadId || "";
            filename = p.filename || "";
            mime = (p.mime || "").toLowerCase();
            size = typeof p.size === "number" ? p.size : 0;
          } catch {
            throw new UploadError({
              code: "VALIDATION_ERROR",
              message: "Invalid client payload",
              status: 400,
            });
          }
        }
        if (!uploadId) {
          throw new UploadError({
            code: "VALIDATION_ERROR",
            message: "Missing uploadId",
            status: 400,
          });
        }
        if (!mime || !isAllowedMediaType(mime)) {
          throw new UploadError({
            code: "VALIDATION_ERROR",
            message: "Unsupported media type",
            status: 400,
          });
        }
        const maximumSizeInBytes = maxBytesForMime(mime);
        if (size && size > maximumSizeInBytes) {
          throw new UploadError({
            code: "VALIDATION_ERROR",
            message: "File too large",
            status: 400,
          });
        }
        if (!pathname.startsWith(`album-img/${uploadId}.`)) {
          throw new UploadError({
            code: "VALIDATION_ERROR",
            message: "Pathname does not match uploadId",
            status: 400,
          });
        }
        await trackUploadEvent({
          uploadId,
          event: "upload_init",
          payload: { mime, size, filename },
        });
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes,
          addRandomSuffix: false,
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const storage = getPhotoStorage();
        if (!storage.registerClientUpload) return;
        let filename = "";
        let mime = "application/octet-stream";
        if (tokenPayload) {
          try {
            const p = JSON.parse(tokenPayload) as {
              uploadId?: string;
              filename?: string;
              mime?: string;
              size?: number;
            };
            const uploadId = p.uploadId || "";
            filename = p.filename || "";
            mime = p.mime || mime;
            await trackUploadEvent({
              uploadId: uploadId || blob.pathname,
              event: "upload_progress",
              payload: { phase: "completed_callback" },
            });
          } catch {
            /* ignore */
          }
        }
        await storage.registerClientUpload({
          uploadId: (() => {
            if (!tokenPayload) return undefined;
            try {
              const p = JSON.parse(tokenPayload) as { uploadId?: string };
              return p.uploadId;
            } catch {
              return undefined;
            }
          })(),
          pathname: blob.pathname,
          filename,
          mime,
          size: blob.size,
        });
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const err = uploadErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}
