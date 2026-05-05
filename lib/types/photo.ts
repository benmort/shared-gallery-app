/** Public shape returned by the API and used in the UI */
export type MediaKind = "image" | "video";
export type ProcessingStatus = "processing" | "done" | "failed";

export type Photo = {
  id: string;
  uploadId?: string;
  filename: string;
  /** Path to fetch full media (same-origin) */
  url: string;
  /** Smaller image for grid; falls back to `url` for video or legacy rows */
  thumbUrl?: string;
  /** Medium image for lightbox; falls back to `url` */
  displayUrl?: string;
  uploadedAt: string;
  kind: MediaKind;
  processingStatus?: ProcessingStatus;
  blurDataUrl?: string;
  width?: number;
  height?: number;
};

/** Stored on disk in photos.json, or in Vercel Blob manifest */
export type PhotoRecord = {
  id: string;
  uploadId?: string;
  filename: string;
  uploadedAt: string;
  /** Filename under data/uploads (filesystem only) */
  storedName: string;
  mime: string;
  processingStatus?: ProcessingStatus;
  processingError?: string;
  blurDataUrl?: string;
  width?: number;
  height?: number;
  /** Optional WebP thumbnail blob name (same prefix as storedName parent path) */
  thumbStoredName?: string;
  /** Optional JPEG display blob name */
  displayStoredName?: string;
};

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB images
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // 250 MB video

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mime.toLowerCase());
}

export function isAllowedVideoType(mime: string): boolean {
  return ALLOWED_VIDEO_MIMES.has(mime.toLowerCase());
}

export function isAllowedMediaType(mime: string): boolean {
  const m = mime.toLowerCase();
  return ALLOWED_IMAGE_MIMES.has(m) || ALLOWED_VIDEO_MIMES.has(m);
}

export function mediaKindFromMime(mime: string): MediaKind {
  return isAllowedVideoType(mime) ? "video" : "image";
}

export function maxBytesForMime(mime: string): number {
  return isAllowedVideoType(mime) ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
}

/** File extension for stored object (no leading dot). */
export function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "video/mp4") return "mp4";
  if (m === "video/webm") return "webm";
  if (m === "video/quicktime") return "mov";
  return "jpg";
}
