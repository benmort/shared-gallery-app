"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect, useState, type ReactNode } from "react";
import type { Photo } from "@/lib/types/photo";
import { galleryImageSrcSet } from "@/utils/galleryImageSrcSet";
import { galleryPath } from "@/utils/galleryUrl";
import { useLastViewedPhoto } from "@/utils/useLastViewedPhoto";

type Props = {
  /** First masonry cell (e.g. Share a moment hero) */
  lead: ReactNode;
  photos: Photo[] | null;
  photosLoading?: boolean;
  /** Keep e.g. `moderation=true` on photo tile links */
  preserveSearchParams?: Record<string, string> | null;
  moderationMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
};

const VIDEO_POSTER_FALLBACK = "/images/video-poster-fallback.svg";

export default function PhotoGallery({
  lead,
  photos,
  photosLoading,
  preserveSearchParams,
  moderationMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: Props) {
  const searchParams = useSearchParams();
  const photoIdOpen = searchParams?.get("photoId") ?? null;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const lastRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (lastViewedPhoto && !photoIdOpen && lastRef.current) {
      lastRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      setLastViewedPhoto(null);
    }
  }, [lastViewedPhoto, photoIdOpen, setLastViewedPhoto]);

  return (
    <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 lg:columns-3">
      {lead}
      {photosLoading && (
        <div className="relative mb-3 break-inside-avoid rounded-xl bg-white/5 py-20 text-center text-sm text-stone-400 ring-1 ring-inset ring-white/10 sm:mb-4">
          Loading photos…
        </div>
      )}
      {photos?.map((photo) => (
        <div
          key={photo.id}
          className="group relative mb-3 break-inside-avoid sm:mb-4"
        >
          {moderationMode && onToggleSelect && (
            <label
              className="absolute left-2 top-2 z-20 flex cursor-pointer items-center gap-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm ring-1 ring-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(photo.id)}
                onChange={() => onToggleSelect(photo.id)}
                className="h-4 w-4 rounded border-white/40"
                aria-label={`Select ${photo.filename}`}
              />
              Select
            </label>
          )}
          <Link
            href={galleryPath(photo.id, preserveSearchParams ?? null)}
            scroll={false}
            ref={photo.id === lastViewedPhoto ? lastRef : undefined}
            onClick={(event) => {
              if (!isMobileViewport) return;
              event.preventDefault();
            }}
            className="after:content relative block w-full cursor-default overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:cursor-zoom-in"
          >
            {photo.kind === "video" ? (
              <video
                src={photo.url}
                poster={photo.thumbUrl ?? VIDEO_POSTER_FALLBACK}
                muted
                playsInline
                preload="metadata"
                className="w-full transform brightness-[0.97] transition will-change-auto group-hover:brightness-100"
                style={{ transform: "translate3d(0, 0, 0)" }}
                width={photo.width ?? 1280}
                height={photo.height ?? 720}
                aria-label={photo.filename}
              />
            ) : galleryImageSrcSet(photo) ? (
              // eslint-disable-next-line @next/next/no-img-element -- custom srcSet not supported on next/image here
              <img
                src={photo.thumbUrl ?? photo.url}
                srcSet={galleryImageSrcSet(photo)}
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                alt={photo.filename}
                width={photo.width ?? 720}
                height={photo.height ?? 480}
                loading="lazy"
                decoding="async"
                className="h-auto w-full transform brightness-[0.97] transition will-change-auto group-hover:brightness-100"
                style={{ transform: "translate3d(0, 0, 0)" }}
              />
            ) : (
              <Image
                alt={photo.filename}
                className="transform brightness-[0.97] transition will-change-auto group-hover:brightness-100"
                style={{ transform: "translate3d(0, 0, 0)" }}
                placeholder={photo.blurDataUrl ? "blur" : "empty"}
                blurDataURL={photo.blurDataUrl}
                src={photo.thumbUrl ?? photo.url}
                width={photo.width ?? 720}
                height={photo.height ?? 480}
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                unoptimized
              />
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}
