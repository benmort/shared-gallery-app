import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import { classifyUploadError, safeErrorMessage } from "@/lib/upload-errors";
import { logUploadEvent } from "@/lib/upload-logging";
import { parseClientUploadPayload } from "@/lib/upload-payload";
import { getUploadSessionStore } from "@/lib/upload-session-store";
import { ensureUploadAuthorized, ensureUploadRateLimit } from "@/lib/upload-security";
import { isUploadV2Enabled } from "@/lib/upload-config";
import { maxBytesForMime } from "@/lib/types/photo";

export const dynamic = "force-dynamic";

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
  if (!isUploadV2Enabled()) {
    return NextResponse.json(
      { error: "Client blob uploads are disabled" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    await ensureUploadAuthorized(request);
    ensureUploadRateLimit(request, "blob-token");
    const sessions = getUploadSessionStore();
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("album-img/")) {
          throw new Error("Invalid pathname");
        }
        const payload = parseClientUploadPayload(clientPayload);
        if (payload.pathname !== pathname) {
          throw new Error("Payload pathname mismatch");
        }
        const maximumSizeInBytes = maxBytesForMime(payload.mime);
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify(payload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const storage = getPhotoStorage();
        if (!storage.registerClientUpload) return;
        const payload = parseClientUploadPayload(tokenPayload);
        await sessions.patchFile(payload.sessionId, payload.fileClientId, {
          status: "uploaded",
          uploadedAt: new Date().toISOString(),
          incrementAttempts: true,
        });
        try {
          const photo = await storage.registerClientUpload({
            pathname: blob.pathname,
            filename: payload.filename,
            mime: payload.mime,
          });
          await sessions.markPhotoRegistered(payload.sessionId, payload.fileClientId, photo.id);
          logUploadEvent("blob-upload.completed", {
            sessionId: payload.sessionId,
            fileClientId: payload.fileClientId,
            photoId: photo.id,
            pathname: blob.pathname,
            mime: payload.mime,
          });
        } catch (error) {
          const message = safeErrorMessage(error);
          await sessions.patchFile(payload.sessionId, payload.fileClientId, {
            status: "failed",
            error: message,
          });
          logUploadEvent(
            "blob-upload.failed",
            {
              sessionId: payload.sessionId,
              fileClientId: payload.fileClientId,
              pathname: blob.pathname,
              mime: payload.mime,
              error: message,
              class: classifyUploadError(error),
            },
            "error",
          );
          throw error;
        }
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message = safeErrorMessage(e);
    const retryAfterMs = (e as Error & { retryAfterMs?: number })?.retryAfterMs;
    logUploadEvent(
      "blob-upload.request-failed",
      {
        error: message,
        class: classifyUploadError(e),
      },
      "warn",
    );
    return NextResponse.json(
      {
        error: message,
        class: classifyUploadError(e),
        retryAfterMs: retryAfterMs ?? null,
      },
      { status: message === "Unauthorized" ? 401 : message.startsWith("Rate limited") ? 429 : 400 },
    );
  }
}
