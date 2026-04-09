import { type Photo, type PhotoRecord, mediaKindFromMime } from "../types/photo";

export type ReadFileResult = {
  buffer: Buffer;
  mime: string;
  /** Full object size in bytes */
  totalSize: number;
  /** True when `buffer` is a byte range slice, not the full file */
  ranged: boolean;
};

export type ReadFileRange = { start: number; end: number };

export type FileMeta = {
  totalSize: number;
  mime: string;
};

/**
 * Swap this implementation for Supabase, S3, Cloudinary, etc.
 * Keep the same surface area for uploads and listing.
 */
export interface PhotoStorage {
  list(): Promise<Photo[]>;
  /** Append one image or video; returns public Photo + persisted record */
  createFromBuffer(input: {
    buffer: Buffer;
    filename: string;
    mime: string;
  }): Promise<Photo>;
  /** Size and MIME for Range requests and headers (no full body read). */
  getFileMeta(id: string): Promise<FileMeta | null>;
  readFile(id: string, range?: ReadFileRange): Promise<ReadFileResult | null>;
}

export function recordToPhoto(r: PhotoRecord): Photo {
  return {
    id: r.id,
    filename: r.filename,
    url: `/api/photos/${r.id}/file`,
    uploadedAt: r.uploadedAt,
    kind: mediaKindFromMime(r.mime),
    blurDataUrl: r.blurDataUrl,
    width: r.width,
    height: r.height,
  };
}
