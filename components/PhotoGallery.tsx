"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect, type ReactNode } from "react";
import type { Photo } from "@/lib/types/photo";
import { useLastViewedPhoto } from "@/utils/useLastViewedPhoto";

type Props = {
  /** First masonry cell (e.g. Share a moment hero) */
  lead: ReactNode;
  photos: Photo[] | null;
  photosLoading?: boolean;
};

export default function PhotoGallery({
  lead,
  photos,
  photosLoading,
}: Props) {
  const searchParams = useSearchParams();
  const photoIdOpen = searchParams?.get("photoId") ?? null;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();
  const lastRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (lastViewedPhoto && !photoIdOpen && lastRef.current) {
      lastRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
      setLastViewedPhoto(null);
    }
  }, [lastViewedPhoto, photoIdOpen, setLastViewedPhoto]);

  return (
    <div className="columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3">
      {lead}
      {photosLoading && (
        <div className="relative mb-4 break-inside-avoid rounded-xl bg-white/5 py-20 text-center text-sm text-stone-400 ring-1 ring-inset ring-white/10 sm:mb-5">
          Loading photos…
        </div>
      )}
      {photos?.map((photo) => (
        <Link
          key={photo.id}
          href={`/?photoId=${photo.id}`}
          scroll={false}
          ref={photo.id === lastViewedPhoto ? lastRef : undefined}
          className="after:content group relative mb-4 block w-full cursor-zoom-in break-inside-avoid after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:mb-5"
        >
          {photo.kind === "video" ? (
            <video
              src={photo.url}
              muted
              playsInline
              preload="metadata"
              className="w-full transform rounded-xl brightness-[0.97] transition will-change-auto group-hover:brightness-100"
              style={{ transform: "translate3d(0, 0, 0)" }}
              width={photo.width ?? 1280}
              height={photo.height ?? 720}
              aria-label={photo.filename}
            />
          ) : (
            <Image
              alt={photo.filename}
              className="transform rounded-xl brightness-[0.97] transition will-change-auto group-hover:brightness-100"
              style={{ transform: "translate3d(0, 0, 0)" }}
              placeholder={photo.blurDataUrl ? "blur" : "empty"}
              blurDataURL={photo.blurDataUrl}
              src={photo.url}
              width={photo.width ?? 720}
              height={photo.height ?? 480}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              unoptimized
            />
          )}
        </Link>
      ))}
    </div>
  );
}
