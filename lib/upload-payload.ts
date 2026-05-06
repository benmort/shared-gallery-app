import { isAllowedMediaType, maxBytesForMime } from "@/lib/types/photo";

export type ClientUploadPayload = {
  filename: string;
  mime: string;
  pathname: string;
  sessionId: string;
  fileClientId: string;
  expectedCount: number;
  size: number;
};

function isSafeId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{3,160}$/.test(value);
}

export function parseClientUploadPayload(raw: string | null | undefined): ClientUploadPayload {
  if (!raw) {
    throw new Error("Missing client payload");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid client payload");
  }
  const payload = parsed as Partial<ClientUploadPayload>;
  const filename = (payload.filename || "").trim();
  const mime = (payload.mime || "").toLowerCase().trim();
  const pathname = (payload.pathname || "").trim();
  const sessionId = (payload.sessionId || "").trim();
  const fileClientId = (payload.fileClientId || "").trim();
  const expectedCount = Number(payload.expectedCount);
  const size = Number(payload.size);

  if (!filename) throw new Error("Missing filename");
  if (!pathname.startsWith("album-img/")) throw new Error("Invalid pathname");
  if (!isAllowedMediaType(mime)) throw new Error("Unsupported media type");
  if (!isSafeId(sessionId)) throw new Error("Invalid session id");
  if (!isSafeId(fileClientId)) throw new Error("Invalid file id");
  if (!Number.isFinite(expectedCount) || expectedCount < 1 || expectedCount > 200) {
    throw new Error("Invalid expected count");
  }
  if (!Number.isFinite(size) || size < 1) {
    throw new Error("Invalid file size");
  }
  if (size > maxBytesForMime(mime)) {
    throw new Error("File too large");
  }
  return {
    filename,
    mime,
    pathname,
    sessionId,
    fileClientId,
    expectedCount,
    size,
  };
}
