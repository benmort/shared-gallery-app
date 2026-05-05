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
export type FileVariant = "original" | "thumb" | "display";

export interface PhotoStorage {
  list(): Promise<Photo[]>;
  /** Paginated list (newest first). */
  listPaged(offset: number, limit: number): Promise<{ photos: Photo[]; total: number }>;
  /** Append one image or video; returns public Photo + persisted record */
  createFromBuffer(input: {
    uploadId?: string;
    buffer: Buffer;
    filename: string;
    mime: string;
  }): Promise<Photo>;
  /** Size and MIME for Range requests and headers (no full body read). */
  getFileMeta(id: string, variant?: FileVariant): Promise<FileMeta | null>;
  readFile(
    id: string,
    range?: ReadFileRange,
    variant?: FileVariant,
  ): Promise<ReadFileResult | null>;
  readFileResponse?(
    id: string,
    range?: ReadFileRange,
    variant?: FileVariant,
  ): Promise<Response | null>;
  /** Remove manifest entry and stored media; returns true if a record existed. */
  deleteById(id: string): Promise<boolean>;
  /** After Vercel Blob client upload completes (blob storage only). */
  registerClientUpload?(input: {
    uploadId?: string;
    pathname: string;
    filename: string;
    mime: string;
    size?: number;
  }): Promise<Photo>;
  initUploadSession?(input: {
    uploadId: string;
    filename: string;
    mime: string;
    size: number;
  }): Promise<{ uploadId: string; pathname: string }>;
  reconcileUploads?(uploadIds: string[]): Promise<{
    photos: Photo[];
    pendingUploadIds: string[];
  }>;
}

export function recordToPhoto(r: PhotoRecord): Photo {
  const base = `/api/photos/${r.id}/file`;
  const kind = mediaKindFromMime(r.mime);
  const thumbUrl =
    kind === "image" && r.thumbStoredName
      ? `${base}?variant=thumb`
      : undefined;
  const displayUrl =
    kind === "image" && r.displayStoredName
      ? `${base}?variant=display`
      : undefined;
  return {
    id: r.id,
    uploadId: r.uploadId,
    filename: r.filename,
    url: base,
    thumbUrl,
    displayUrl,
    uploadedAt: r.uploadedAt,
    kind,
    processingStatus: r.processingStatus ?? "done",
    blurDataUrl: r.blurDataUrl,
    width: r.width,
    height: r.height,
  };
}
