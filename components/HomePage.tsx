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
import ShowreelFooter from "./ShowreelFooter";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showreel = searchParams?.get("showreel") === "true";
  const moderation = searchParams?.get("moderation") === "true";
  const preserveUrlParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (showreel) p.showreel = "true";
    if (moderation) p.moderation = "true";
    return Object.keys(p).length ? p : null;
  }, [showreel, moderation]);

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((): Promise<void> => {
    setError(null);
    return fetch("/api/photos")
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
      router.replace(galleryPath(null, preserveUrlParams), { scroll: false });
    }
  }, [photoId, photos, router, preserveUrlParams]);

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
          <ShowreelFooter />
        </div>
        {photos && photos.length > 0 && (
          <PhotoModal
            photos={photos}
            preserveSearchParams={preserveUrlParams}
            moderation={moderation}
            onPhotosReload={load}
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
          lead={
            moderation ? null : (
              <ShareMomentGridBlock onUploadSuccess={load} />
            )
          }
          photos={photos}
          photosLoading={photos === null && !error}
          preserveSearchParams={preserveUrlParams}
        />

        {photos && photos.length > 0 && (
          <PhotoModal
            photos={photos}
            preserveSearchParams={preserveUrlParams}
            moderation={moderation}
            onPhotosReload={load}
          />
        )}
      </main>
    </>
  );
}
