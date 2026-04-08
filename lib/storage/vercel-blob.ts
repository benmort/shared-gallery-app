import { randomUUID } from "crypto";
import { get, put } from "@vercel/blob";
import sharp from "sharp";
import type { PhotoRecord } from "../types/photo";
import { isAllowedImageType, MAX_FILE_BYTES } from "../types/photo";
import type { PhotoStorage } from "./types";
import { recordToPhoto } from "./types";

/** Single JSON index in the blob store (stable pathname, no random suffix). */
const MANIFEST_PATH = "album-manifest.json";
/** Image blobs live under this prefix. */
const IMG_PREFIX = "album-img/";

/** Private blobs only — requires a [private Vercel Blob store](https://vercel.com/docs/vercel-blob/private-storage). */
const ACCESS = "private" as const;

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

    async createFromBuffer(input) {
      const { buffer, filename, mime } = input;
      if (!isAllowedImageType(mime)) {
        throw new Error("Unsupported image type");
      }
      if (buffer.length > MAX_FILE_BYTES) {
        throw new Error("File too large");
      }

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
      const pathname = `${IMG_PREFIX}${storedName}`;

      await put(pathname, buffer, {
        access: ACCESS,
        addRandomSuffix: false,
        contentType: mime,
        token,
      });

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

      const records = await readManifest(token);
      records.unshift(record);
      await writeManifest(records, token);

      return recordToPhoto(record);
    },

    async readFile(id: string) {
      const records = await readManifest(token);
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      const pathname = `${IMG_PREFIX}${rec.storedName}`;
      try {
        const result = await get(pathname, { access: ACCESS, token });
        if (!result || result.statusCode !== 200 || !result.stream) return null;
        const buf = Buffer.from(await new Response(result.stream).arrayBuffer());
        return { buffer: buf, mime: rec.mime };
      } catch {
        return null;
      }
    },
  };
}
