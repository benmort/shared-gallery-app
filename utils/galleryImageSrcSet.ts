import type { Photo } from "@/lib/types/photo";

/** Matches derivative widths from `lib/image-derivatives.ts` (client-safe). */
const THUMB_W = 420;
const DISPLAY_W = 1920;

/** Responsive `srcSet` for masonry grid (thumb + display + full). */
export function galleryImageSrcSet(photo: Photo): string | undefined {
  if (photo.kind !== "image") return undefined;
  if (!photo.thumbUrl || !photo.displayUrl) return undefined;
  return `${photo.thumbUrl} ${THUMB_W}w, ${photo.displayUrl} ${DISPLAY_W}w, ${photo.url} 3840w`;
}
