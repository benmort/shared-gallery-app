"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Photo } from "@/lib/types/photo";
import { galleryPath } from "@/utils/galleryUrl";
import PhotoGallery from "./PhotoGallery";
import PhotoModal from "./PhotoModal";
import ScrollToTop from "./ScrollToTop";
import ShareMomentGridBlock from "./ShareMomentGridBlock";
import ShowreelCarousel from "./ShowreelCarousel";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showreel = searchParams?.get("showreel") === "true";
  const preserveShowreel = useMemo(
    () => (showreel ? ({ showreel: "true" } as Record<string, string>) : null),
    [showreel],
  );

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetch("/api/photos")
      .then((r) => {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error("bad");
        setPhotos(
          (data as Photo[]).map((p) => ({
            ...p,
            kind: p.kind === "video" ? "video" : "image",
          })),
        );
      })
      .catch(() => {
        setError("We couldn’t load photos. Pull to refresh or try again.");
        setPhotos(null);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const photoId = searchParams?.get("photoId") ?? null;
  useEffect(() => {
    if (!photoId || photos === null || photos.length === 0) return;
    const ok = photos.some((p) => p.id === photoId);
    if (!ok) {
      router.replace(galleryPath(null, preserveShowreel), { scroll: false });
    }
  }, [photoId, photos, router, preserveShowreel]);

  const errorBanner = error && photos === null && (
    <div
      role="alert"
      className={
        showreel
          ? "relative z-10 mx-auto mt-2 w-full max-w-lg shrink-0 rounded-xl bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100 ring-1 ring-amber-500/30 sm:mx-5"
          : "mx-auto mb-6 max-w-lg rounded-xl bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100 ring-1 ring-amber-500/30"
      }
    >
      {error}
      <button
        type="button"
        onClick={() => {
          setPhotos(null);
          load();
        }}
        className="mt-2 block w-full text-center font-medium text-amber-300 underline"
      >
        Retry
      </button>
    </div>
  );

  if (showreel) {
    return (
      <>
        <div className="fixed inset-0 z-0 flex flex-col bg-black">
          {errorBanner}
          <ShowreelCarousel
            photos={photos}
            loading={photos === null && !error}
          />
          <ShareMomentGridBlock variant="showreel" onUploadSuccess={load} />
        </div>
        {photos && photos.length > 0 && (
          <PhotoModal
            photos={photos}
            preserveSearchParams={preserveShowreel}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      <main className="mx-auto max-w-[1960px] px-4 pb-16 pt-4 sm:px-6">
        {errorBanner}

        <PhotoGallery
          lead={<ShareMomentGridBlock onUploadSuccess={load} />}
          photos={photos}
          photosLoading={photos === null && !error}
        />

        {photos && photos.length > 0 && (
          <PhotoModal photos={photos} preserveSearchParams={preserveShowreel} />
        )}
      </main>
    </>
  );
}
