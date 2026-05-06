import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getPhotoStorage } from "@/lib/storage";
import {
  isAllowedMediaType,
  maxBytesForMime,
} from "@/lib/types/photo";

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

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("album-img/")) {
          throw new Error("Invalid pathname");
        }
        let mime = "";
        if (clientPayload) {
          try {
            const p = JSON.parse(clientPayload) as { mime?: string };
            mime = (p.mime || "").toLowerCase();
          } catch {
            throw new Error("Invalid client payload");
          }
        }
        if (!mime || !isAllowedMediaType(mime)) {
          throw new Error("Unsupported media type");
        }
        const maximumSizeInBytes = maxBytesForMime(mime);
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
              filename?: string;
              mime?: string;
            };
            filename = p.filename || "";
            mime = p.mime || mime;
          } catch {
            /* ignore */
          }
        }
        await storage.registerClientUpload({
          pathname: blob.pathname,
          filename,
          mime,
        });
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
