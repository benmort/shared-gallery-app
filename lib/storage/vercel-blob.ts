import { randomUUID } from "crypto";
import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  BlobServiceNotAvailable,
  BlobServiceRateLimited,
  del,
  get,
  head,
  put,
} from "@vercel/blob";
import sharp from "sharp";
import type { PhotoRecord } from "../types/photo";
import {
  extensionForMime,
  isAllowedMediaType,
  isAllowedVideoType,
  maxBytesForMime,
} from "../types/photo";
import type { PhotoStorage, ReadFileRange, ReadFileResult } from "./types";
import { recordToPhoto } from "./types";

/** Single JSON index in the blob store (stable pathname, no random suffix). */
const MANIFEST_PATH = "album-manifest.json";
/** Image blobs live under this prefix. */
const IMG_PREFIX = "album-img/";

/** Private blobs only — requires a [private Vercel Blob store](https://vercel.com/docs/vercel-blob/private-storage). */
const ACCESS = "private" as const;

/** Same store-id extraction as `@vercel/blob` `get()` for pathname → URL. */
function getStoreIdFromToken(t: string): string {
  const [, , , storeId = ""] = t.split("_");
  return storeId;
}

/** `del()` is documented with full blob URLs; pathnames alone can resolve inconsistently for private blobs. */
function privateBlobUrl(pathname: string, token: string): string {
  const storeId = getStoreIdFromToken(token);
  if (!storeId) {
    throw new Error("Invalid BLOB_READ_WRITE_TOKEN (missing store id)");
  }
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delete API blob; retries transient failures. `BlobNotFoundError` = already gone (ok).
 */
async function deleteBlobMedia(url: string, token: string): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await del(url, { token });
      return;
    } catch (e) {
      if (e instanceof BlobNotFoundError) return;
      lastErr = e;
      if (e instanceof BlobServiceRateLimited && e.retryAfter) {
        await sleep(Math.min(e.retryAfter * 1000, 8000));
        continue;
      }
      if (e instanceof BlobServiceNotAvailable) {
        await sleep(150 * 2 ** attempt);
        continue;
      }
      await sleep(100 * 2 ** attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Read–modify–write manifest with optimistic concurrency (`ifMatch` ETag) so concurrent
 * serverless invocations do not overwrite each other's changes.
 */
async function mutateManifest(
  token: string,
  mutator: (records: PhotoRecord[]) => PhotoRecord[],
): Promise<void> {
  for (let attempt = 0; attempt < 25; attempt++) {
    let etag: string | undefined;
    try {
      const h = await head(MANIFEST_PATH, { token });
      etag = h.etag;
    } catch {
      etag = undefined;
    }
    const records = await readManifest(token);
    const next = mutator(records);
    try {
      await put(MANIFEST_PATH, JSON.stringify(next), {
        access: ACCESS,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        token,
        ifMatch: etag,
      });
      return;
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) continue;
      throw e;
    }
  }
  throw new Error("Failed to update album manifest after concurrent writes");
}

function parseTotalFromContentRange(header: string | null): number | null {
  if (!header) return null;
  const m = header.trim().match(/\/(\d+)\s*$/);
  if (m) return parseInt(m[1], 10);
  return null;
}

async function makeBlurDataUrl(buffer: Buffer): Promise<string | undefined> {
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize(12, 12, { fit: "inside" })
      .jpeg({ quality: 55 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function readMeta(buffer: Buffer): Promise<{ width?: number; height?: number }> {
  try {
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width ?? undefined,
      height: meta.height ?? undefined,
    };
  } catch {
    return {};
  }
}

async function readManifest(token: string): Promise<PhotoRecord[]> {
  try {
    const result = await get(MANIFEST_PATH, { access: ACCESS, token });
    if (!result || result.statusCode !== 200 || !result.stream) return [];
    const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
    const raw = buf.toString("utf8");
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as PhotoRecord[]) : [];
  } catch {
    return [];
  }
}

export function createVercelBlobPhotoStorage(token: string): PhotoStorage {
  return {
    async list() {
      const records = await readManifest(token);
      return records.map(recordToPhoto);
    },

    async getFileMeta(id: string) {
      const records = await readManifest(token);
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      const pathname = `${IMG_PREFIX}${rec.storedName}`;
      try {
        const h = await head(pathname, { token });
        return { totalSize: h.size, mime: rec.mime };
      } catch {
        return null;
      }
    },

    async createFromBuffer(input) {
      const { buffer, filename, mime } = input;
      if (!isAllowedMediaType(mime)) {
        throw new Error("Unsupported media type");
      }
      const limit = maxBytesForMime(mime);
      if (buffer.length > limit) {
        throw new Error("File too large");
      }

      const id = randomUUID();
      const ext = extensionForMime(mime);
      const storedName = `${id}.${ext}`;
      const pathname = `${IMG_PREFIX}${storedName}`;

      await put(pathname, buffer, {
        access: ACCESS,
        addRandomSuffix: false,
        contentType: mime,
        token,
      });

      const isVideo = isAllowedVideoType(mime);
      const [blurDataUrl, meta] = isVideo
        ? [undefined, {}] as [undefined, { width?: number; height?: number }]
        : await Promise.all([makeBlurDataUrl(buffer), readMeta(buffer)]);

      const record: PhotoRecord = {
        id,
        filename: filename || (isVideo ? `video.${ext}` : `photo.${ext}`),
        uploadedAt: new Date().toISOString(),
        storedName,
        mime,
        blurDataUrl,
        width: meta.width,
        height: meta.height,
      };

      try {
        await mutateManifest(token, (records) => [record, ...records]);
      } catch (e) {
        try {
          await deleteBlobMedia(privateBlobUrl(pathname, token), token);
        } catch {
          /* best-effort rollback */
        }
        throw e;
      }

      return recordToPhoto(record);
    },

    async readFile(id: string, range?: ReadFileRange): Promise<ReadFileResult | null> {
      const records = await readManifest(token);
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      const pathname = `${IMG_PREFIX}${rec.storedName}`;
      try {
        if (!range) {
          const result = await get(pathname, { access: ACCESS, token });
          if (!result || result.statusCode !== 200 || !result.stream) return null;
          const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
          return {
            buffer: buf,
            mime: rec.mime,
            totalSize: result.blob.size,
            ranged: false,
          };
        }

        const result = await get(pathname, {
          access: ACCESS,
          token,
          headers: { Range: `bytes=${range.start}-${range.end}` },
        });
        if (!result?.stream) return null;

        const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
        const code = result.statusCode as number;

        if (code === 200) {
          return { buffer: buf, mime: rec.mime, totalSize: buf.length, ranged: false };
        }

        if (code === 206) {
          const totalSize =
            parseTotalFromContentRange(result.headers.get("content-range")) ?? buf.length;
          return { buffer: buf, mime: rec.mime, totalSize, ranged: true };
        }

        return null;
      } catch {
        return null;
      }
    },

    async deleteById(id: string) {
      const records = await readManifest(token);
      const rec = records.find((r) => r.id === id);
      if (!rec) return false;
      const pathname = `${IMG_PREFIX}${rec.storedName}`;
      const url = privateBlobUrl(pathname, token);
      await deleteBlobMedia(url, token);
      await mutateManifest(token, (prev) => prev.filter((r) => r.id !== id));
      return true;
    },
  };
}
