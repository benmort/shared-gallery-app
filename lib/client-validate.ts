import { ALLOWED_IMAGE_MIMES, MAX_FILE_BYTES } from "@/lib/types/photo";

function guessMime(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
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
