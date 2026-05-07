import sharp from "sharp";

/** Moments wall image — extra small WebP for masonry tiles. */
export const WALL_MAX = 280;
/** Grid thumbnails — small WebP. */
export const THUMB_MAX = 420;
/** Lightbox / display — bounded JPEG. */
export const DISPLAY_MAX = 1920;

export async function makeImageDerivatives(buffer: Buffer): Promise<{
  wall: Buffer;
  thumb: Buffer;
  display: Buffer;
}> {
  const [wall, thumb, display] = await Promise.all([
    sharp(buffer)
      .rotate()
      .resize(WALL_MAX, WALL_MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer(),
    sharp(buffer)
      .rotate()
      .resize(DISPLAY_MAX, DISPLAY_MAX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
  ]);
  return { wall, thumb, display };
}
