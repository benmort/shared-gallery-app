/** Build homepage path with optional `showreel` and `photoId` query params. */
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
