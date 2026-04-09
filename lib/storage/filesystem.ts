import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const INDEX_PATH = path.join(DATA_DIR, "photos.json");

async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function readIndex(): Promise<PhotoRecord[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf-8");
    const parsed = JSON.parse(raw) as PhotoRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(records: PhotoRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${INDEX_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf-8");
  await fs.rename(tmp, INDEX_PATH);
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

export function createFilesystemStorage(): PhotoStorage {
  return {
    async list() {
      const records = await readIndex();
      return records.map(recordToPhoto);
    },

    async getFileMeta(id: string) {
      const records = await readIndex();
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      const filePath = path.join(UPLOADS_DIR, rec.storedName);
      try {
        const stat = await fs.stat(filePath);
        return { totalSize: stat.size, mime: rec.mime };
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

      await ensureDirs();
      const id = randomUUID();
      const ext = extensionForMime(mime);
      const storedName = `${id}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedName);

      await fs.writeFile(filePath, buffer);

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

      const records = await readIndex();
      records.unshift(record);
      await writeIndex(records);

      return recordToPhoto(record);
    },

    async readFile(id: string, range?: ReadFileRange): Promise<ReadFileResult | null> {
      const records = await readIndex();
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      const filePath = path.join(UPLOADS_DIR, rec.storedName);
      try {
        const stat = await fs.stat(filePath);
        const totalSize = stat.size;
        if (!range) {
          const buffer = await fs.readFile(filePath);
          return { buffer, mime: rec.mime, totalSize, ranged: false };
        }
        const { start } = range;
        let { end } = range;
        if (start >= totalSize) return null;
        end = Math.min(end, totalSize - 1);
        if (start > end || start < 0) return null;
        const stream = createReadStream(filePath, { start, end });
        const buffer = await readStreamToBuffer(stream);
        return { buffer, mime: rec.mime, totalSize, ranged: true };
      } catch {
        return null;
      }
    },
  };
}
