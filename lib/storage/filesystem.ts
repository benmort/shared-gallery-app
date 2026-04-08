import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { PhotoRecord } from "../types/photo";
import { isAllowedImageType, MAX_FILE_BYTES } from "../types/photo";
import type { PhotoStorage } from "./types";
import { recordToPhoto } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const INDEX_PATH = path.join(DATA_DIR, "photos.json");

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

    async createFromBuffer(input) {
      const { buffer, filename, mime } = input;
      if (!isAllowedImageType(mime)) {
        throw new Error("Unsupported image type");
      }
      if (buffer.length > MAX_FILE_BYTES) {
        throw new Error("File too large");
      }

      await ensureDirs();
      const id = randomUUID();
      const ext =
        mime === "image/png"
          ? "png"
          : mime === "image/webp"
            ? "webp"
            : mime === "image/gif"
              ? "gif"
              : "jpg";
      const storedName = `${id}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, storedName);

      await fs.writeFile(filePath, buffer);

      const [blurDataUrl, meta] = await Promise.all([
        makeBlurDataUrl(buffer),
        readMeta(buffer),
      ]);

      const record: PhotoRecord = {
        id,
        filename: filename || `photo.${ext}`,
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

    async readFile(id: string) {
      const records = await readIndex();
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      const filePath = path.join(UPLOADS_DIR, rec.storedName);
      try {
        const buffer = await fs.readFile(filePath);
        return { buffer, mime: rec.mime };
      } catch {
        return null;
      }
    },
  };
}
