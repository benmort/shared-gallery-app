/** Public shape returned by the API and used in the UI */
export type Photo = {
  id: string;
  filename: string;
  /** Path to fetch full image (same-origin) */
  url: string;
  uploadedAt: string;
  blurDataUrl?: string;
  width?: number;
  height?: number;
};

/** Stored on disk in photos.json */
export type PhotoRecord = {
  id: string;
  filename: string;
  uploadedAt: string;
  /** Filename under data/uploads */
  storedName: string;
  mime: string;
  blurDataUrl?: string;
  width?: number;
  height?: number;
};

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mime.toLowerCase());
}
