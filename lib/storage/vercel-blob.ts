import { randomUUID } from "crypto";
import { del, get, head, put } from "@vercel/blob";
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

async function writeManifest(records: PhotoRecord[], token: string): Promise<void> {
  await put(MANIFEST_PATH, JSON.stringify(records), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
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

      const records = await readManifest(token);
      records.unshift(record);
      await writeManifest(records, token);

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
      try {
        await del(pathname, { token });
      } catch {
        /* blob may already be gone */
      }
      const next = records.filter((r) => r.id !== id);
      await writeManifest(next, token);
      return true;
    },
  };
}
