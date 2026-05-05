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
import { makeImageDerivatives } from "../image-derivatives";
import type { FileVariant, PhotoStorage, ReadFileRange, ReadFileResult } from "./types";
import { recordToPhoto } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const INDEX_PATH = path.join(DATA_DIR, "photos.json");
let indexWriteLock: Promise<void> = Promise.resolve();

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

async function withIndexWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = indexWriteLock.then(fn, fn);
  indexWriteLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

function variantMime(variant: FileVariant, recMime: string): string {
  if (variant === "thumb") return "image/webp";
  if (variant === "display") return "image/jpeg";
  return recMime;
}

export function createFilesystemStorage(): PhotoStorage {
  return {
    async list() {
      const records = await readIndex();
      return records.map(recordToPhoto);
    },

    async listPaged(offset: number, limit: number) {
      const records = await readIndex();
      const total = records.length;
      const slice = records.slice(offset, offset + limit);
      return { photos: slice.map(recordToPhoto), total };
    },

    async getFileMeta(id: string, variant: FileVariant = "original") {
      const records = await readIndex();
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      if (variant === "thumb" && !rec.thumbStoredName) return null;
      if (variant === "display" && !rec.displayStoredName) return null;
      const name =
        variant === "thumb" && rec.thumbStoredName
          ? rec.thumbStoredName
          : variant === "display" && rec.displayStoredName
            ? rec.displayStoredName
            : rec.storedName;
      const filePath = path.join(UPLOADS_DIR, name);
      try {
        const stat = await fs.stat(filePath);
        return { totalSize: stat.size, mime: variantMime(variant, rec.mime) };
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

      await ensureDirs();
      const id = uploadId || randomUUID();
      const ext = extensionForMime(mime);
      const storedName = `${id}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedName);

      await fs.writeFile(filePath, buffer);

      const isVideo = isAllowedVideoType(mime);
      let thumbStoredName: string | undefined;
      let displayStoredName: string | undefined;
      const [blurDataUrl, meta] = isVideo
        ? [undefined, {}] as [undefined, { width?: number; height?: number }]
        : await Promise.all([makeBlurDataUrl(buffer), readMeta(buffer)]);

      if (!isVideo) {
        const { thumb, display } = await makeImageDerivatives(buffer);
        thumbStoredName = `${id}-thumb.webp`;
        displayStoredName = `${id}-display.jpg`;
        await fs.writeFile(path.join(UPLOADS_DIR, thumbStoredName), thumb);
        await fs.writeFile(path.join(UPLOADS_DIR, displayStoredName), display);
      }

      const record: PhotoRecord = {
        id,
        uploadId: id,
        filename: filename || (isVideo ? `video.${ext}` : `photo.${ext}`),
        uploadedAt: new Date().toISOString(),
        storedName,
        mime,
        processingStatus: "done",
        blurDataUrl,
        width: meta.width,
        height: meta.height,
        thumbStoredName,
        displayStoredName,
      };

      await withIndexWriteLock(async () => {
        const records = await readIndex();
        const existingIdx = records.findIndex(
          (existing) => existing.uploadId === id || existing.id === id,
        );
        if (existingIdx >= 0) {
          records.splice(existingIdx, 1);
        }
        records.unshift(record);
        await writeIndex(records);
      });

      return recordToPhoto(record);
    },

    async readFile(
      id: string,
      range?: ReadFileRange,
      variant: FileVariant = "original",
    ): Promise<ReadFileResult | null> {
      const records = await readIndex();
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      if (variant === "thumb" && !rec.thumbStoredName) return null;
      if (variant === "display" && !rec.displayStoredName) return null;
      const fileName =
        variant === "thumb" && rec.thumbStoredName
          ? rec.thumbStoredName
          : variant === "display" && rec.displayStoredName
            ? rec.displayStoredName
            : rec.storedName;
      const filePath = path.join(UPLOADS_DIR, fileName);
      const outMime = variantMime(variant, rec.mime);
      try {
        const stat = await fs.stat(filePath);
        const totalSize = stat.size;
        if (!range) {
          const buffer = await fs.readFile(filePath);
          return { buffer, mime: outMime, totalSize, ranged: false };
        }
        const { start } = range;
        let { end } = range;
        if (start >= totalSize) return null;
        end = Math.min(end, totalSize - 1);
        if (start > end || start < 0) return null;
        const stream = createReadStream(filePath, { start, end });
        const buffer = await readStreamToBuffer(stream);
        return { buffer, mime: outMime, totalSize, ranged: true };
      } catch {
        return null;
      }
    },

    async deleteById(id: string) {
      const rec = await withIndexWriteLock(async () => {
        const records = await readIndex();
        const found = records.find((r) => r.id === id);
        if (!found) return null;
        const next = records.filter((r) => r.id !== id);
        await writeIndex(next);
        return found;
      });
      if (!rec) return false;
      const paths = [
        path.join(UPLOADS_DIR, rec.storedName),
        rec.thumbStoredName && path.join(UPLOADS_DIR, rec.thumbStoredName),
        rec.displayStoredName && path.join(UPLOADS_DIR, rec.displayStoredName),
      ].filter(Boolean) as string[];
      for (const filePath of paths) {
        try {
          await fs.unlink(filePath);
        } catch {
          /* file already missing */
        }
      }
      return true;
    },

    async initUploadSession(input) {
      const ext = extensionForMime(input.mime);
      return {
        uploadId: input.uploadId,
        pathname: `album-img/${input.uploadId}.${ext}`,
      };
    },

    async reconcileUploads(uploadIds) {
      const records = await readIndex();
      const pendingUploadIds: string[] = [];
      const photos = uploadIds.flatMap((uploadId) => {
        const rec = records.find((r) => r.uploadId === uploadId || r.id === uploadId);
        if (!rec) {
          pendingUploadIds.push(uploadId);
          return [];
        }
        return [recordToPhoto(rec)];
      });
      return { photos, pendingUploadIds };
    },
  };
}
