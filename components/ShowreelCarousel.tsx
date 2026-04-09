"use client";

import Image from "next/image";
import Link from "next/link";
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
  const list = photos ?? [];
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
          No photos yet. Add some below — they will appear here automatically.
        </p>
      )}

      {hasSlides && (
        <div className="group relative flex min-h-[min(52dvh,480px)] flex-1 items-center overflow-hidden py-6">
          <div className="flex w-max animate-showreel-marquee items-stretch gap-4 pl-4 pr-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {slides.map((photo, i) => (
              <Link
                key={`${photo.id}-${i}`}
                href={`/?showreel=true&photoId=${photo.id}`}
                scroll={false}
                className="relative h-[min(52dvh,480px)] w-[min(78vw,340px)] shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 transition hover:ring-amber-400/40 sm:w-[min(72vw,400px)]"
              >
                {photo.kind === "video" ? (
                  <video
                    src={photo.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                    aria-label={photo.filename}
                  />
                ) : (
                  <Image
                    src={photo.url}
                    alt={photo.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 78vw, 400px"
                    unoptimized
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
