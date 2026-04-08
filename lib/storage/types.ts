import type { Photo, PhotoRecord } from "../types/photo";

/**
 * Swap this implementation for Supabase, S3, Cloudinary, etc.
 * Keep the same surface area for uploads and listing.
 */
export interface PhotoStorage {
  list(): Promise<Photo[]>;
  /** Append one image; returns public Photo + persisted record */
  createFromBuffer(input: {
    buffer: Buffer;
    filename: string;
    mime: string;
  }): Promise<Photo>;
  readFile(id: string): Promise<{ buffer: Buffer; mime: string } | null>;
}

export function recordToPhoto(r: PhotoRecord): Photo {
  return {
    id: r.id,
    filename: r.filename,
    url: r.publicUrl ?? `/api/photos/${r.id}/file`,
    uploadedAt: r.uploadedAt,
    blurDataUrl: r.blurDataUrl,
    width: r.width,
    height: r.height,
  };
}
