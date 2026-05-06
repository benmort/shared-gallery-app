import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isUploadV2Enabled } from "@/lib/upload-config";
import { parseClientUploadPayload } from "@/lib/upload-payload";
import { getUploadSessionStore } from "@/lib/upload-session-store";
import { ensureUploadAuthorized, ensureUploadRateLimit } from "@/lib/upload-security";

export const dynamic = "force-dynamic";

type StartUploadSessionBody = {
  files?: Array<{
    fileClientId: string;
    pathname: string;
    filename: string;
    mime: string;
    size: number;
  }>;
};

export async function POST(request: Request) {
  try {
    if (!isUploadV2Enabled()) {
      return NextResponse.json({ error: "Upload sessions disabled" }, { status: 503 });
    }
    await ensureUploadAuthorized(request);
    ensureUploadRateLimit(request, "upload-session-create");
    const body = (await request.json()) as StartUploadSessionBody;
    const filesRaw = Array.isArray(body.files) ? body.files : [];
    if (!filesRaw.length) {
      return NextResponse.json({ error: "No files selected" }, { status: 400 });
    }
    const sessionId = randomUUID();
    const files = filesRaw.map((file) =>
      parseClientUploadPayload(
        JSON.stringify({
          ...file,
          sessionId,
          expectedCount: filesRaw.length,
        }),
      ),
    );
    const store = getUploadSessionStore();
    const session = await store.create({
      sessionId,
      expectedCount: files.length,
      files: files.map((file) => ({
        clientFileId: file.fileClientId,
        pathname: file.pathname,
        filename: file.filename,
        mime: file.mime,
        size: file.size,
      })),
    });
    return NextResponse.json({
      sessionId: session.sessionId,
      expectedCount: session.expectedCount,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create upload session";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : message.startsWith("Rate limited") ? 429 : 400 },
    );
  }
}
