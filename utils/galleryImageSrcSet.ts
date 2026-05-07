import type { Photo } from "@/lib/types/photo";

/** Matches derivative widths from `lib/image-derivatives.ts` (client-safe). */
const WALL_W = 280;
const THUMB_W = 420;
const DISPLAY_W = 1920;

/** Responsive `srcSet` for masonry grid (wall + thumb + display + full). */
export function galleryImageSrcSet(photo: Photo): string | undefined {
  if (photo.kind !== "image") return undefined;
  if (!photo.displayUrl) return undefined;
  const wallOrThumb = photo.wallUrl ?? photo.thumbUrl;
  if (!wallOrThumb) return undefined;
  const parts = [
    photo.wallUrl ? `${photo.wallUrl} ${WALL_W}w` : "",
    photo.thumbUrl ? `${photo.thumbUrl} ${THUMB_W}w` : "",
    `${photo.displayUrl} ${DISPLAY_W}w`,
    `${photo.url} 3840w`,
  ].filter(Boolean);
  return parts.join(", ");
}
