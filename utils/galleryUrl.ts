/** Build homepage path with optional `photoId` and preserved query params (e.g. `showreel`, `moderation`). */
export function galleryPath(
  photoId?: string | null,
  preserve?: Record<string, string> | null,
): string {
  const u = new URLSearchParams();
  if (preserve) {
    for (const [key, value] of Object.entries(preserve)) {
      u.set(key, value);
    }
  }
  if (photoId) u.set("photoId", photoId);
  const q = u.toString();
  return q ? `/?${q}` : "/";
}
