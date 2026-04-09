import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_FILE_BYTES,
  MAX_VIDEO_BYTES,
  maxBytesForMime,
} from "@/lib/types/photo";

function guessMime(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  if (n.endsWith(".mov")) return "video/quicktime";
  return "";
}

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" is too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB).`;
  }
  const mime = guessMime(file);
  if (!mime || !ALLOWED_IMAGE_MIMES.has(mime)) {
    return `"${file.name}" is not a supported image (JPEG, PNG, WebP, or GIF).`;
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  const mime = guessMime(file);
  if (!mime || !ALLOWED_VIDEO_MIMES.has(mime)) {
    return `"${file.name}" is not a supported video (MP4, WebM, or MOV).`;
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `"${file.name}" is too large (max ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} MB).`;
  }
  return null;
}

export function validateMediaFile(file: File): string | null {
  const mime = guessMime(file);
  if (!mime || (!ALLOWED_IMAGE_MIMES.has(mime) && !ALLOWED_VIDEO_MIMES.has(mime))) {
    return `"${file.name}" is not a supported type (images: JPEG, PNG, WebP, GIF; video: MP4, WebM, MOV).`;
  }
  const maxBytes = maxBytesForMime(mime);
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return `"${file.name}" is too large (max ${mb} MB for this file type).`;
  }
  return null;
}

export { MAX_FILE_BYTES, MAX_VIDEO_BYTES };
