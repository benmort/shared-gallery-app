import { randomUUID } from "crypto";
import { list, put } from "@vercel/blob";
import sharp from "sharp";
import type { PhotoRecord } from "../types/photo";
import { isAllowedImageType, MAX_FILE_BYTES } from "../types/photo";
import type { PhotoStorage } from "./types";
import { recordToPhoto } from "./types";

/** Single JSON index in the blob store (stable pathname, no random suffix). */
const MANIFEST_PATH = "album-manifest.json";
/** Image blobs live under this prefix. */
const IMG_PREFIX = "album-img/";

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
    let cursor: string | undefined;
    for (;;) {
      const { blobs, cursor: next, hasMore } = await list({
        prefix: MANIFEST_PATH,
        limit: 100,
        cursor,
        token,
      });
      const meta = blobs.find((b) => b.pathname === MANIFEST_PATH);
      if (meta) {
        const res = await fetch(meta.url);
        if (!res.ok) return [];
        const data = (await res.json()) as unknown;
        return Array.isArray(data) ? (data as PhotoRecord[]) : [];
      }
      if (!hasMore || !next) return [];
      cursor = next;
    }
  } catch {
    return [];
  }
}

async function writeManifest(records: PhotoRecord[], token: string): Promise<void> {
  await put(MANIFEST_PATH, JSON.stringify(records), {
    access: "public",
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

      const { url: publicUrl } = await put(pathname, buffer, {
        access: "public",
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
        publicUrl,
      };

      const records = await readManifest(token);
      records.unshift(record);
      await writeManifest(records, token);

      return recordToPhoto(record);
    },

    async readFile(id: string) {
      const records = await readManifest(token);
      const rec = records.find((r) => r.id === id);
      if (!rec?.publicUrl) return null;
      try {
        const res = await fetch(rec.publicUrl);
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return { buffer: buf, mime: rec.mime };
      } catch {
        return null;
      }
    },
  };
}
