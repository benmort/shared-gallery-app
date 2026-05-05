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
import { makeImageDerivatives } from "../image-derivatives";
import type { PhotoRecord } from "../types/photo";
import {
  extensionForMime,
  isAllowedMediaType,
  isAllowedVideoType,
  maxBytesForMime,
} from "../types/photo";
import {
  dbConfigured,
  deleteMediaRecord,
  enqueueProcessingJob,
  getMediaById,
  getMediaByUploadId,
  getMediaByUploadIds,
  listMediaAll,
  listMediaPaged,
  upsertMediaRecord,
} from "./postgres-metadata";
import type { FileVariant, PhotoStorage, ReadFileRange, ReadFileResult } from "./types";
import { recordToPhoto } from "./types";
import {
  uploadDbOnlyEnabled,
  uploadDbReadEnabled,
  uploadDualWriteEnabled,
  uploadProcessingQueueEnabled,
} from "@/lib/upload/flags";
import { trackUploadEvent } from "@/lib/upload/observability";

/** Single JSON index in the blob store (stable pathname, no random suffix). */
const MANIFEST_PATH = "album-manifest.json";
/** Image blobs live under this prefix. */
const IMG_PREFIX = "album-img/";

/** Private blobs only — requires a [private Vercel Blob store](https://vercel.com/docs/vercel-blob/private-storage). */
const ACCESS = "private" as const;

function dbEnabled(): boolean {
  return dbConfigured();
}

function dbReadEnabled(): boolean {
  return dbEnabled() && uploadDbReadEnabled();
}

function dbOnlyEnabled(): boolean {
  return dbEnabled() && uploadDbOnlyEnabled();
}

function dbWriteEnabled(): boolean {
  return dbEnabled() && (uploadDualWriteEnabled() || uploadDbReadEnabled() || uploadDbOnlyEnabled());
}

function manifestWriteEnabled(): boolean {
  return !dbOnlyEnabled();
}

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

async function readRecords(token: string): Promise<PhotoRecord[]> {
  if (dbReadEnabled()) {
    try {
      return await listMediaAll();
    } catch {
      if (dbOnlyEnabled()) return [];
    }
  }
  return readManifest(token);
}

async function readRecordById(token: string, id: string): Promise<PhotoRecord | null> {
  if (dbReadEnabled()) {
    try {
      const record = await getMediaById(id);
      if (record) return record;
    } catch {
      if (dbOnlyEnabled()) return null;
    }
  }
  if (dbOnlyEnabled()) return null;
  const records = await readManifest(token);
  return records.find((r) => r.id === id) ?? null;
}

async function writeRecord(token: string, record: PhotoRecord): Promise<void> {
  const writes: Promise<unknown>[] = [];
  if (manifestWriteEnabled()) {
    writes.push(
      mutateManifest(token, (records) => {
        const next = records.filter(
          (r) => r.id !== record.id && r.uploadId !== record.uploadId,
        );
        return [record, ...next];
      }),
    );
  }
  if (dbWriteEnabled()) {
    writes.push(upsertMediaRecord(record));
  }
  await Promise.all(writes);
}

async function removeRecord(token: string, id: string): Promise<void> {
  const writes: Promise<unknown>[] = [];
  if (manifestWriteEnabled()) {
    writes.push(mutateManifest(token, (prev) => prev.filter((r) => r.id !== id)));
  }
  if (dbWriteEnabled()) {
    writes.push(deleteMediaRecord(id));
  }
  await Promise.all(writes);
}

function variantStoredName(
  rec: PhotoRecord,
  variant: FileVariant,
): { name: string; mime: string } | null {
  if (variant === "original") {
    return { name: rec.storedName, mime: rec.mime };
  }
  if (variant === "thumb") {
    if (!rec.thumbStoredName) return null;
    return { name: rec.thumbStoredName, mime: "image/webp" };
  }
  if (variant === "display") {
    if (!rec.displayStoredName) return null;
    return { name: rec.displayStoredName, mime: "image/jpeg" };
  }
  return null;
}

export function createVercelBlobPhotoStorage(token: string): PhotoStorage {
  return {
    async list() {
      const records = await readRecords(token);
      return records.map(recordToPhoto);
    },

    async listPaged(offset: number, limit: number) {
      if (dbReadEnabled()) {
        try {
          const { records, total } = await listMediaPaged(offset, limit);
          return { photos: records.map(recordToPhoto), total };
        } catch {
          if (dbOnlyEnabled()) return { photos: [], total: 0 };
        }
      }
      const records = await readManifest(token);
      const total = records.length;
      const slice = records.slice(offset, offset + limit);
      return { photos: slice.map(recordToPhoto), total };
    },

    async getFileMeta(id: string, variant: FileVariant = "original") {
      const rec = await readRecordById(token, id);
      if (!rec) return null;
      const pick = variantStoredName(rec, variant);
      if (!pick) return null;
      const pathname = `${IMG_PREFIX}${pick.name}`;
      try {
        const h = await head(pathname, { token });
        return { totalSize: h.size, mime: pick.mime };
      } catch {
        return null;
      }
    },

    async createFromBuffer(input) {
      const { buffer, filename, mime, uploadId } = input;
      if (!isAllowedMediaType(mime)) {
        throw new Error("Unsupported media type");
      }
      const limit = maxBytesForMime(mime);
      if (buffer.length > limit) {
        throw new Error("File too large");
      }

      const id = uploadId || randomUUID();
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
      const queueEnabled = dbEnabled() && uploadProcessingQueueEnabled();
      let thumbStoredName: string | undefined;
      let displayStoredName: string | undefined;
      const [blurDataUrl, meta] = isVideo
        ? [undefined, {}] as [undefined, { width?: number; height?: number }]
        : await Promise.all([makeBlurDataUrl(buffer), readMeta(buffer)]);

      if (!isVideo && !queueEnabled) {
        const { thumb, display } = await makeImageDerivatives(buffer);
        thumbStoredName = `${id}-thumb.webp`;
        displayStoredName = `${id}-display.jpg`;
        await put(`${IMG_PREFIX}${thumbStoredName}`, thumb, {
          access: ACCESS,
          addRandomSuffix: false,
          contentType: "image/webp",
          token,
        });
        await put(`${IMG_PREFIX}${displayStoredName}`, display, {
          access: ACCESS,
          addRandomSuffix: false,
          contentType: "image/jpeg",
          token,
        });
      }

      const record: PhotoRecord = {
        id,
        uploadId: id,
        filename: filename || (isVideo ? `video.${ext}` : `photo.${ext}`),
        uploadedAt: new Date().toISOString(),
        storedName,
        mime,
        processingStatus: isVideo || !queueEnabled ? "done" : "processing",
        blurDataUrl,
        width: meta.width,
        height: meta.height,
        thumbStoredName,
        displayStoredName,
      };

      try {
        await writeRecord(token, record);
        await trackUploadEvent({
          uploadId: id,
          event: "upload_complete",
          payload: { source: "server", kind: isVideo ? "video" : "image" },
        });
        if (!isVideo && queueEnabled) {
          await enqueueProcessingJob({
            uploadId: id,
            photoId: id,
          });
          await trackUploadEvent({
            uploadId: id,
            event: "job_enqueued",
            payload: { source: "server" },
          });
        }
      } catch (e) {
        try {
          await deleteBlobMedia(privateBlobUrl(pathname, token), token);
          if (thumbStoredName) {
            await deleteBlobMedia(
              privateBlobUrl(`${IMG_PREFIX}${thumbStoredName}`, token),
              token,
            );
          }
          if (displayStoredName) {
            await deleteBlobMedia(
              privateBlobUrl(`${IMG_PREFIX}${displayStoredName}`, token),
              token,
            );
          }
        } catch {
          /* best-effort rollback */
        }
        throw e;
      }

      return recordToPhoto(record);
    },

    async readFile(
      id: string,
      range?: ReadFileRange,
      variant: FileVariant = "original",
    ): Promise<ReadFileResult | null> {
      const rec = await readRecordById(token, id);
      if (!rec) return null;
      const pick = variantStoredName(rec, variant);
      if (!pick) return null;
      const pathname = `${IMG_PREFIX}${pick.name}`;
      try {
        if (!range) {
          const result = await get(pathname, { access: ACCESS, token });
          if (!result || result.statusCode !== 200 || !result.stream) return null;
          const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
          return {
            buffer: buf,
            mime: pick.mime,
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
          return { buffer: buf, mime: pick.mime, totalSize: buf.length, ranged: false };
        }

        if (code === 206) {
          const totalSize =
            parseTotalFromContentRange(result.headers.get("content-range")) ?? buf.length;
          return { buffer: buf, mime: pick.mime, totalSize, ranged: true };
        }

        return null;
      } catch {
        return null;
      }
    },

    async readFileResponse(
      id: string,
      range?: ReadFileRange,
      variant: FileVariant = "original",
    ): Promise<Response | null> {
      const rec = await readRecordById(token, id);
      if (!rec) return null;
      const pick = variantStoredName(rec, variant);
      if (!pick) return null;
      const pathname = `${IMG_PREFIX}${pick.name}`;
      try {
        const result = await get(pathname, {
          access: ACCESS,
          token,
          headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined,
        });
        if (!result?.stream) return null;
        const status = result.statusCode as number;
        if (status !== 200 && status !== 206) return null;
        const contentLength =
          result.headers.get("content-length") ||
          (result.blob?.size ? String(result.blob.size) : null);
        const headers: Record<string, string> = {
          "Content-Type": pick.mime,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        };
        if (contentLength) headers["Content-Length"] = contentLength;
        const contentRange = result.headers.get("content-range");
        if (contentRange) headers["Content-Range"] = contentRange;
        return new Response(result.stream as ReadableStream, {
          status,
          headers,
        });
      } catch {
        return null;
      }
    },

    async deleteById(id: string) {
      const rec = await readRecordById(token, id);
      if (!rec) return false;
      const paths = [
        `${IMG_PREFIX}${rec.storedName}`,
        rec.thumbStoredName && `${IMG_PREFIX}${rec.thumbStoredName}`,
        rec.displayStoredName && `${IMG_PREFIX}${rec.displayStoredName}`,
      ].filter(Boolean) as string[];
      for (const p of paths) {
        try {
          await deleteBlobMedia(privateBlobUrl(p, token), token);
        } catch {
          /* best-effort */
        }
      }
      await removeRecord(token, id);
      return true;
    },

    async registerClientUpload(input: {
      uploadId?: string;
      pathname: string;
      filename: string;
      mime: string;
      size?: number;
    }) {
      const { pathname, filename, mime, size, uploadId } = input;
      if (!pathname.startsWith(IMG_PREFIX)) {
        throw new Error("Invalid upload pathname");
      }
      if (!isAllowedMediaType(mime)) {
        throw new Error("Unsupported media type");
      }
      const existingUploadId = uploadId || pathname.slice(IMG_PREFIX.length).split(".")[0];
      if (dbEnabled()) {
        const existing = await getMediaByUploadId(existingUploadId);
        if (existing) return recordToPhoto(existing);
      }
      const blobMeta = await head(pathname, { token });
      const actualSize = size ?? blobMeta.size;
      const limit = maxBytesForMime(mime);
      if (actualSize > limit) {
        throw new Error("File too large");
      }

      const baseName = pathname.slice(IMG_PREFIX.length);
      const dot = baseName.lastIndexOf(".");
      const id = uploadId || (dot > 0 ? baseName.slice(0, dot) : baseName);
      const storedName = baseName;
      const extFromName = dot > 0 ? baseName.slice(dot + 1) : extensionForMime(mime);

      const isVideo = isAllowedVideoType(mime);
      const queueEnabled = dbEnabled() && uploadProcessingQueueEnabled();
      let thumbStoredName: string | undefined;
      let displayStoredName: string | undefined;
      let blurDataUrl: string | undefined;
      let meta: { width?: number; height?: number } = {};
      if (!isVideo && !queueEnabled) {
        const result = await get(pathname, { access: ACCESS, token });
        if (!result || result.statusCode !== 200 || !result.stream) {
          throw new Error("Uploaded blob not found");
        }
        const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
        [blurDataUrl, meta] = await Promise.all([makeBlurDataUrl(buffer), readMeta(buffer)]);
        const { thumb, display } = await makeImageDerivatives(buffer);
        thumbStoredName = `${id}-thumb.webp`;
        displayStoredName = `${id}-display.jpg`;
        await put(`${IMG_PREFIX}${thumbStoredName}`, thumb, {
          access: ACCESS,
          addRandomSuffix: false,
          contentType: "image/webp",
          token,
        });
        await put(`${IMG_PREFIX}${displayStoredName}`, display, {
          access: ACCESS,
          addRandomSuffix: false,
          contentType: "image/jpeg",
          token,
        });
      }

      const record: PhotoRecord = {
        id,
        uploadId: id,
        filename: filename || (isVideo ? `video.${extFromName}` : `photo.${extFromName}`),
        uploadedAt: new Date().toISOString(),
        storedName,
        mime,
        processingStatus: isVideo || !queueEnabled ? "done" : "processing",
        blurDataUrl,
        width: meta.width,
        height: meta.height,
        thumbStoredName,
        displayStoredName,
      };

      try {
        await writeRecord(token, record);
        await trackUploadEvent({
          uploadId: id,
          event: "upload_complete",
          payload: { source: "blob", kind: isVideo ? "video" : "image" },
        });
        if (!isVideo && queueEnabled) {
          await enqueueProcessingJob({
            uploadId: id,
            photoId: id,
          });
          await trackUploadEvent({
            uploadId: id,
            event: "job_enqueued",
            payload: { source: "blob" },
          });
        }
      } catch (e) {
        try {
          await deleteBlobMedia(privateBlobUrl(pathname, token), token);
          if (thumbStoredName) {
            await deleteBlobMedia(
              privateBlobUrl(`${IMG_PREFIX}${thumbStoredName}`, token),
              token,
            );
          }
          if (displayStoredName) {
            await deleteBlobMedia(
              privateBlobUrl(`${IMG_PREFIX}${displayStoredName}`, token),
              token,
            );
          }
        } catch {
          /* best-effort rollback */
        }
        throw e;
      }

      return recordToPhoto(record);
    },

    async initUploadSession(input) {
      const ext = extensionForMime(input.mime);
      const pathname = `${IMG_PREFIX}${input.uploadId}.${ext}`;
      await trackUploadEvent({
        uploadId: input.uploadId,
        event: "upload_init",
        payload: { mime: input.mime, size: input.size },
      });
      return { uploadId: input.uploadId, pathname };
    },

    async reconcileUploads(uploadIds) {
      if (dbEnabled()) {
        const records = await getMediaByUploadIds(uploadIds);
        const byUploadId = new Map(records.map((record) => [record.uploadId || record.id, record]));
        const pendingUploadIds = uploadIds.filter((id) => {
          const rec = byUploadId.get(id);
          if (!rec) return true;
          return rec.processingStatus === "processing";
        });
        return {
          photos: records.map(recordToPhoto),
          pendingUploadIds,
        };
      }
      const records = await readManifest(token);
      const byUploadId = new Map(
        records.map((record) => [record.uploadId || record.id, record]),
      );
      const pendingUploadIds = uploadIds.filter((id) => !byUploadId.has(id));
      return {
        photos: uploadIds
          .map((id) => byUploadId.get(id))
          .filter(Boolean)
          .map((record) => recordToPhoto(record as PhotoRecord)),
        pendingUploadIds,
      };
    },
  };
}
