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
import { logUploadEvent } from "@/lib/upload-logging";
import { makeImageDerivatives } from "../image-derivatives";
import type { PhotoRecord } from "../types/photo";
import {
  extensionForMime,
  isAllowedMediaType,
  isAllowedVideoType,
  maxBytesForMime,
} from "../types/photo";
import type { FileVariant, PhotoStorage, ReadFileRange, ReadFileResult } from "./types";
import { recordToPhoto } from "./types";

const LEGACY_MANIFEST_PATH = "album-manifest.json";
const MANIFEST_PREFIX = "album-manifests/";
const MANIFEST_INDEX_PATH = `${MANIFEST_PREFIX}index.json`;
const IMG_PREFIX = "album-img/";
const ACCESS = "private" as const;
const IMAGE_PROCESSING_TIMEOUT_MS = Math.max(
  1500,
  Number.parseInt(process.env.MOMENTS_IMAGE_PROCESSING_TIMEOUT_MS || "", 10) || 15_000,
);

type ManifestIndex = {
  version: 1;
  shards: string[];
  updatedAt: string;
};

function getStoreIdFromToken(t: string): string {
  const [, , , storeId = ""] = t.split("_");
  return storeId;
}

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

function parseTotalFromContentRange(header: string | null): number | null {
  if (!header) return null;
  const m = header.trim().match(/\/(\d+)\s*$/);
  if (m) return parseInt(m[1], 10);
  return null;
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, IMAGE_PROCESSING_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

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

async function readJsonBlob<T>(pathname: string, token: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: ACCESS, token });
    if (!result?.stream || result.statusCode !== 200) return null;
    const raw = Buffer.from(await new Response(result.stream).arrayBuffer()).toString("utf8");
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function mutateJsonBlob<T>(
  pathname: string,
  token: string,
  fallback: T,
  mutator: (current: T) => T,
): Promise<T> {
  for (let attempt = 0; attempt < 30; attempt++) {
    let etag: string | undefined;
    try {
      const h = await head(pathname, { token });
      etag = h.etag;
    } catch {
      etag = undefined;
    }
    const current = (await readJsonBlob<T>(pathname, token)) ?? fallback;
    const next = mutator(current);
    try {
      await put(pathname, JSON.stringify(next), {
        access: ACCESS,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        token,
        ifMatch: etag,
      });
      return next;
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) continue;
      throw e;
    }
  }
  throw new Error(`Failed to update ${pathname} after concurrent writes`);
}

function shardKey(isoTime: string): string {
  const d = new Date(isoTime);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shardPath(key: string): string {
  return `${MANIFEST_PREFIX}${key}.json`;
}

function sortShardKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => b.localeCompare(a));
}

function variantStoredName(
  rec: PhotoRecord,
  variant: FileVariant,
): { name: string; mime: string } | null {
  if (variant === "original") {
    return { name: rec.storedName, mime: rec.mime };
  }
  if (variant === "wall") {
    if (!rec.wallStoredName) return null;
    return { name: rec.wallStoredName, mime: "image/webp" };
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

async function makeBlurDataUrl(buffer: Buffer): Promise<string | undefined> {
  try {
    const out = await withTimeout(
      sharp(buffer).rotate().resize(12, 12, { fit: "inside" }).jpeg({ quality: 55 }).toBuffer(),
      "blur generation",
    );
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function readMeta(buffer: Buffer): Promise<{ width?: number; height?: number }> {
  try {
    const meta = await withTimeout(sharp(buffer).metadata(), "metadata read");
    return {
      width: meta.width ?? undefined,
      height: meta.height ?? undefined,
    };
  } catch {
    return {};
  }
}

async function readManifestIndex(token: string): Promise<ManifestIndex | null> {
  return readJsonBlob<ManifestIndex>(MANIFEST_INDEX_PATH, token);
}

async function writeManifestIndex(token: string, index: ManifestIndex): Promise<void> {
  await put(MANIFEST_INDEX_PATH, JSON.stringify(index), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
}

async function readLegacyManifest(token: string): Promise<PhotoRecord[]> {
  const data = await readJsonBlob<PhotoRecord[]>(LEGACY_MANIFEST_PATH, token);
  return Array.isArray(data) ? data : [];
}

async function ensureShardedManifest(token: string): Promise<ManifestIndex> {
  const existing = await readManifestIndex(token);
  if (existing && Array.isArray(existing.shards)) return existing;

  const legacy = await readLegacyManifest(token);
  const byShard = new Map<string, PhotoRecord[]>();
  for (const rec of legacy) {
    const key = shardKey(rec.uploadedAt);
    const list = byShard.get(key) || [];
    list.push(rec);
    byShard.set(key, list);
  }
  const shards = sortShardKeys([...byShard.keys()]);
  for (const key of shards) {
    await put(shardPath(key), JSON.stringify(byShard.get(key) || []), {
      access: ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token,
    });
  }
  const index: ManifestIndex = {
    version: 1,
    shards,
    updatedAt: new Date().toISOString(),
  };
  await writeManifestIndex(token, index);
  return index;
}

async function readShardRecords(token: string, key: string): Promise<PhotoRecord[]> {
  const data = await readJsonBlob<PhotoRecord[]>(shardPath(key), token);
  if (!Array.isArray(data)) return [];
  return data;
}

async function mutateShardRecords(
  token: string,
  key: string,
  mutator: (records: PhotoRecord[]) => PhotoRecord[],
): Promise<void> {
  await mutateJsonBlob<PhotoRecord[]>(shardPath(key), token, [], mutator);
}

async function addShardToIndex(token: string, key: string): Promise<void> {
  await mutateJsonBlob<ManifestIndex>(
    MANIFEST_INDEX_PATH,
    token,
    { version: 1, shards: [], updatedAt: new Date().toISOString() },
    (current) => {
      const has = current.shards.includes(key);
      const shards = has ? current.shards : sortShardKeys([key, ...current.shards]);
      return { version: 1, shards, updatedAt: new Date().toISOString() };
    },
  );
}

async function appendRecord(token: string, record: PhotoRecord): Promise<void> {
  await ensureShardedManifest(token);
  const key = shardKey(record.uploadedAt);
  await addShardToIndex(token, key);
  await mutateShardRecords(token, key, (records) => {
    if (records.some((r) => r.id === record.id || r.storedName === record.storedName)) {
      return records;
    }
    return [record, ...records];
  });
}

async function readAllRecords(token: string): Promise<PhotoRecord[]> {
  const index = await readManifestIndex(token);
  if (!index || !Array.isArray(index.shards) || index.shards.length === 0) {
    return readLegacyManifest(token);
  }
  const out: PhotoRecord[] = [];
  for (const key of sortShardKeys(index.shards)) {
    const shard = await readShardRecords(token, key);
    out.push(...shard);
  }
  out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return out;
}

async function readPagedRecords(
  token: string,
  offset: number,
  limit: number,
): Promise<{ records: PhotoRecord[]; total: number }> {
  const index = await readManifestIndex(token);
  if (!index || !Array.isArray(index.shards) || index.shards.length === 0) {
    const all = await readLegacyManifest(token);
    return { records: all.slice(offset, offset + limit), total: all.length };
  }
  const target = offset + limit;
  let total = 0;
  const collected: PhotoRecord[] = [];
  for (const key of sortShardKeys(index.shards)) {
    const shard = await readShardRecords(token, key);
    total += shard.length;
    if (collected.length < target) {
      collected.push(...shard);
    }
  }
  collected.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return { records: collected.slice(offset, offset + limit), total };
}

async function findRecord(token: string, predicate: (record: PhotoRecord) => boolean) {
  const index = await readManifestIndex(token);
  if (!index || !index.shards.length) {
    const legacy = await readLegacyManifest(token);
    return legacy.find(predicate);
  }
  for (const key of sortShardKeys(index.shards)) {
    const shard = await readShardRecords(token, key);
    const hit = shard.find(predicate);
    if (hit) return hit;
  }
  return undefined;
}

async function upsertRecordById(
  token: string,
  id: string,
  updater: (existing: PhotoRecord | undefined) => PhotoRecord | null,
): Promise<void> {
  await ensureShardedManifest(token);
  const index = (await readManifestIndex(token)) || { version: 1, shards: [], updatedAt: "" };
  let existing: PhotoRecord | undefined;
  let existingShard: string | null = null;
  for (const key of sortShardKeys(index.shards)) {
    const shard = await readShardRecords(token, key);
    const found = shard.find((r) => r.id === id);
    if (found) {
      existing = found;
      existingShard = key;
      break;
    }
  }
  const next = updater(existing);
  if (!next) {
    if (existingShard) {
      await mutateShardRecords(token, existingShard, (records) => records.filter((r) => r.id !== id));
    }
    return;
  }
  const targetShard = shardKey(next.uploadedAt);
  await addShardToIndex(token, targetShard);
  await mutateShardRecords(token, targetShard, (records) => {
    const without = records.filter((r) => r.id !== id);
    return [next, ...without];
  });
  if (existingShard && existingShard !== targetShard) {
    await mutateShardRecords(token, existingShard, (records) => records.filter((r) => r.id !== id));
  }
}

async function buildImageRecord(
  token: string,
  input: {
    id: string;
    storedName: string;
    filename: string;
    mime: string;
    uploadedAt: string;
    buffer: Buffer;
  },
): Promise<PhotoRecord> {
  const { id, storedName, filename, mime, uploadedAt, buffer } = input;
  const [blurDataUrl, meta, derivatives] = await Promise.all([
    makeBlurDataUrl(buffer),
    readMeta(buffer),
    withTimeout(makeImageDerivatives(buffer), "image derivatives"),
  ]);
  const wallStoredName = `${id}-wall.webp`;
  const thumbStoredName = `${id}-thumb.webp`;
  const displayStoredName = `${id}-display.jpg`;
  await put(`${IMG_PREFIX}${wallStoredName}`, derivatives.wall, {
    access: ACCESS,
    addRandomSuffix: false,
    contentType: "image/webp",
    token,
  });
  await put(`${IMG_PREFIX}${thumbStoredName}`, derivatives.thumb, {
    access: ACCESS,
    addRandomSuffix: false,
    contentType: "image/webp",
    token,
  });
  await put(`${IMG_PREFIX}${displayStoredName}`, derivatives.display, {
    access: ACCESS,
    addRandomSuffix: false,
    contentType: "image/jpeg",
    token,
  });
  return {
    id,
    filename,
    uploadedAt,
    storedName,
    mime,
    blurDataUrl,
    width: meta.width,
    height: meta.height,
    wallStoredName,
    thumbStoredName,
    displayStoredName,
  };
}

async function buildVideoRecord(input: {
  id: string;
  storedName: string;
  filename: string;
  mime: string;
  uploadedAt: string;
}): Promise<PhotoRecord> {
  return {
    id: input.id,
    filename: input.filename,
    uploadedAt: input.uploadedAt,
    storedName: input.storedName,
    mime: input.mime,
  };
}

export function createVercelBlobPhotoStorage(token: string): PhotoStorage {
  return {
    async list() {
      const records = await readAllRecords(token);
      return records.map(recordToPhoto);
    },

    async listPaged(offset: number, limit: number) {
      const { records, total } = await readPagedRecords(token, offset, limit);
      return { photos: records.map(recordToPhoto), total };
    },

    async listByIds(ids: string[]) {
      if (!ids.length) return [];
      const all = await readAllRecords(token);
      const byId = new Map(all.map((r) => [r.id, r]));
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => recordToPhoto(r!));
    },

    async getFileMeta(id: string, variant: FileVariant = "original") {
      const rec = await findRecord(token, (r) => r.id === id);
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
      const uploadedAt = new Date().toISOString();
      const isVideo = isAllowedVideoType(mime);

      await put(pathname, buffer, {
        access: ACCESS,
        addRandomSuffix: false,
        contentType: mime,
        token,
      });

      let record: PhotoRecord;
      if (isVideo) {
        record = await buildVideoRecord({
          id,
          storedName,
          filename: filename || `video.${ext}`,
          mime,
          uploadedAt,
        });
      } else {
        record = await buildImageRecord(token, {
          id,
          storedName,
          filename: filename || `photo.${ext}`,
          mime,
          uploadedAt,
          buffer,
        });
      }

      try {
        await appendRecord(token, record);
      } catch (e) {
        try {
          await deleteBlobMedia(privateBlobUrl(pathname, token), token);
          if (record.wallStoredName) {
            await deleteBlobMedia(privateBlobUrl(`${IMG_PREFIX}${record.wallStoredName}`, token), token);
          }
          if (record.thumbStoredName) {
            await deleteBlobMedia(privateBlobUrl(`${IMG_PREFIX}${record.thumbStoredName}`, token), token);
          }
          if (record.displayStoredName) {
            await deleteBlobMedia(privateBlobUrl(`${IMG_PREFIX}${record.displayStoredName}`, token), token);
          }
        } catch {
          /* best-effort rollback */
        }
        throw e;
      }

      logUploadEvent("photo.created", {
        id,
        mime,
        size: buffer.length,
        kind: isVideo ? "video" : "image",
      });
      return recordToPhoto(record);
    },

    async readFile(
      id: string,
      range?: ReadFileRange,
      variant: FileVariant = "original",
    ): Promise<ReadFileResult | null> {
      const rec = await findRecord(token, (r) => r.id === id);
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

    async deleteById(id: string) {
      const rec = await findRecord(token, (r) => r.id === id);
      if (!rec) return false;
      const paths = [
        `${IMG_PREFIX}${rec.storedName}`,
        rec.wallStoredName && `${IMG_PREFIX}${rec.wallStoredName}`,
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
      await upsertRecordById(token, id, () => null);
      return true;
    },

    async registerClientUpload(input: {
      pathname: string;
      filename: string;
      mime: string;
    }) {
      const { pathname, filename, mime } = input;
      if (!pathname.startsWith(IMG_PREFIX)) {
        throw new Error("Invalid upload pathname");
      }
      if (!isAllowedMediaType(mime)) {
        throw new Error("Unsupported media type");
      }

      const baseName = pathname.slice(IMG_PREFIX.length);
      const dot = baseName.lastIndexOf(".");
      const id = dot > 0 ? baseName.slice(0, dot) : baseName;
      const storedName = baseName;
      const extFromName = dot > 0 ? baseName.slice(dot + 1) : extensionForMime(mime);
      const existing = await findRecord(token, (r) => r.id === id || r.storedName === storedName);
      if (existing) return recordToPhoto(existing);

      const uploadedAt = new Date().toISOString();
      const isVideo = isAllowedVideoType(mime);
      const blobHead = await head(pathname, { token });
      const limit = maxBytesForMime(mime);
      if (blobHead.size > limit) {
        throw new Error("File too large");
      }

      let record: PhotoRecord;
      if (isVideo) {
        record = await buildVideoRecord({
          id,
          storedName,
          filename: filename || `video.${extFromName}`,
          mime,
          uploadedAt,
        });
      } else {
        const result = await get(pathname, { access: ACCESS, token });
        if (!result || result.statusCode !== 200 || !result.stream) {
          throw new Error("Uploaded blob not found");
        }
        const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
        if (buffer.length > limit) {
          throw new Error("File too large");
        }
        record = await buildImageRecord(token, {
          id,
          storedName,
          filename: filename || `photo.${extFromName}`,
          mime,
          uploadedAt,
          buffer,
        });
      }

      await appendRecord(token, record);
      logUploadEvent("client-upload.registered", {
        id,
        mime,
        kind: isVideo ? "video" : "image",
        pathname,
      });
      return recordToPhoto(record);
    },

    async repairManifest() {
      await ensureShardedManifest(token);
      const all = await readAllRecords(token);
      const byId = new Map<string, PhotoRecord>();
      for (const record of all) {
        if (!byId.has(record.id)) byId.set(record.id, record);
      }
      const deduped = [...byId.values()].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      const grouped = new Map<string, PhotoRecord[]>();
      for (const record of deduped) {
        const key = shardKey(record.uploadedAt);
        const arr = grouped.get(key) || [];
        arr.push(record);
        grouped.set(key, arr);
      }
      const keys = sortShardKeys([...grouped.keys()]);
      for (const key of keys) {
        await put(shardPath(key), JSON.stringify(grouped.get(key) || []), {
          access: ACCESS,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json",
          token,
        });
      }
      await writeManifestIndex(token, {
        version: 1,
        shards: keys,
        updatedAt: new Date().toISOString(),
      });
      return {
        repaired: true,
        details: [
          `Rebuilt manifest index with ${keys.length} shard(s)`,
          `Retained ${deduped.length} unique record(s)`,
        ],
      };
    },
  };
}
