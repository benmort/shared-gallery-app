export type GalleryMode = "gallery" | "showreel" | "moderation";

const MODE_BASE: Record<GalleryMode, string> = {
  gallery: "/moments",
  showreel: "/moments/showreel",
  moderation: "/moments/moderation",
};

/** Build gallery path with optional `photoId`, using the route segment for the current mode. */
export function galleryPath(
  photoId?: string | null,
  mode: GalleryMode = "gallery",
): string {
  const base = MODE_BASE[mode];
  const u = new URLSearchParams();
  if (photoId) u.set("photoId", photoId);
  const q = u.toString();
  return q ? `${base}?${q}` : base;
}
