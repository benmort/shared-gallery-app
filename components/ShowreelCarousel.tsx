"use client";

import type { Photo } from "@/lib/types/photo";

type Props = {
  photos: Photo[] | null;
  loading?: boolean;
};

/** Build at least two copies for seamless translateX(-50%) loop. */
function loopSlides(photos: Photo[]): Photo[] {
  if (photos.length === 0) return [];
  if (photos.length === 1) {
    return Array.from({ length: 12 }, () => photos[0]!);
  }
  return [...photos, ...photos];
}

export default function ShowreelCarousel({ photos, loading }: Props) {
  const list = (photos ?? []).filter((p) => p.kind === "image");
  const slides = loopSlides(list);
  const hasSlides = slides.length > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_65%)]"
        aria-hidden
      />

      {loading && (
        <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-sm text-stone-500">
          Loading showreel…
        </p>
      )}

      {!loading && !hasSlides && (
        <p className="absolute left-1/2 top-1/2 z-10 max-w-sm -translate-x-1/2 -translate-y-1/2 px-4 text-center text-sm text-stone-500">
          No photos yet. Add them from the main gallery page.
        </p>
      )}

      {hasSlides && (
        <div className="relative flex min-h-0 flex-1 items-center overflow-hidden py-3 sm:py-4">
          <div className="flex w-max animate-showreel-marquee items-stretch gap-5 pl-5 pr-5 motion-reduce:animate-none sm:gap-6 sm:pl-6 sm:pr-6">
            {slides.map((photo, i) => (
              <div
                key={`${photo.id}-${i}`}
                className="relative h-[min(78dvh,820px)] w-max shrink-0 sm:h-[min(82dvh,880px)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- height-anchored intrinsic width; next/image width/height attrs block h-full */}
                <img
                  src={photo.url}
                  alt=""
                  className="pointer-events-none block h-full w-auto max-w-none select-none rounded-2xl ring-1 ring-white/10"
                  draggable={false}
                  decoding="async"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
