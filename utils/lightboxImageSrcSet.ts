import type { Photo } from "@/lib/types/photo";

/** Lightbox main view: display variant + full original for large / retina. */
export function lightboxImageSrcSet(photo: Photo): string | undefined {
  if (photo.kind !== "image") return undefined;
  if (!photo.displayUrl) return undefined;
  return `${photo.displayUrl} 1920w, ${photo.url} 3840w`;
}
