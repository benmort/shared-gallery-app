"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Photo } from "@/lib/types/photo";
import { galleryPath } from "@/utils/galleryUrl";
import ModerationLogin from "./ModerationLogin";
import PhotoGallery from "./PhotoGallery";
import PhotoModal from "./PhotoModal";
import ScrollToTop from "./ScrollToTop";
import ShareMomentGridBlock from "./ShareMomentGridBlock";
import ShowreelCarousel from "./ShowreelCarousel";
import ShowreelFooter from "./ShowreelFooter";

const PAGE = 48;

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

  /** Home URL without moderation (still preserves showreel when set). */
  const homeHref = useMemo(() => {
    const p: Record<string, string> = {};
    if (showreel) p.showreel = "true";
    return galleryPath(null, Object.keys(p).length ? p : null);
  }, [showreel]);

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [moderationChecked, setModerationChecked] = useState(!moderation);
  const [moderationOk, setModerationOk] = useState(!moderation);
  const [moderationConfigured, setModerationConfigured] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const normalizePhoto = useCallback((p: Photo): Photo => ({
    ...p,
    kind: p.kind === "video" ? "video" : "image",
  }), []);

  const photoId = searchParams?.get("photoId") ?? null;

  const load = useCallback((): Promise<void> => {
    setError(null);
    const needsFullList = !!photoId;
    const url = needsFullList
      ? "/api/photos"
      : `/api/photos?offset=0&limit=${PAGE}`;
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then((data: unknown) => {
        if (needsFullList) {
          if (!Array.isArray(data)) throw new Error("bad");
          const list = (data as Photo[]).map(normalizePhoto);
          setPhotos(list);
          setTotal(list.length);
          return;
        }
        const body = data as {
          photos?: Photo[];
          total?: number;
        };
        if (!Array.isArray(body.photos) || typeof body.total !== "number") {
          throw new Error("bad");
        }
        setPhotos(body.photos.map(normalizePhoto));
        setTotal(body.total);
      })
      .catch(() => {
        setError("We couldn’t load photos. Pull to refresh or try again.");
        setPhotos(null);
        setTotal(0);
      });
  }, [normalizePhoto, photoId]);

  const loadMore = useCallback(() => {
    if (!photos || photos.length >= total) return;
    void fetch(`/api/photos?offset=${photos.length}&limit=${PAGE}`)
      .then((r) => {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then((data: unknown) => {
        const body = data as { photos?: Photo[]; total?: number };
        if (!Array.isArray(body.photos)) throw new Error("bad");
        setPhotos((prev) => [
          ...(prev ?? []),
          ...body.photos!.map(normalizePhoto),
        ]);
        if (typeof body.total === "number") setTotal(body.total);
      })
      .catch(() => {
        setError("Couldn’t load more photos.");
      });
  }, [photos, total, normalizePhoto]);

  const mergeUploadedPhotos = useCallback(
    (uploaded: Photo[]) => {
      if (!uploaded.length) return;
      const normalized = uploaded.map(normalizePhoto);
      setPhotos((prev) => {
        if (!prev) return normalized;
        const ids = new Set(normalized.map((p) => p.id));
        return [...normalized, ...prev.filter((p) => !ids.has(p.id))];
      });
      setTotal((t) => t + normalized.length);
    },
    [normalizePhoto],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!moderation) {
      setModerationChecked(true);
      setModerationOk(true);
      return;
    }
    let cancelled = false;
    void fetch("/api/auth/moderation")
      .then((r) => r.json())
      .then((data: { ok?: boolean; configured?: boolean }) => {
        if (cancelled) return;
        setModerationConfigured(data.configured !== false);
        setModerationOk(!!data.ok);
        setModerationChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setModerationOk(false);
        setModerationChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [moderation]);

  useEffect(() => {
    if (!photoId || photos === null || photos.length === 0) return;
    const ok = photos.some((p) => p.id === photoId);
    if (!ok) {
      router.replace(galleryPath(null, preserveUrlParams), { scroll: false });
    }
  }, [photoId, photos, router, preserveUrlParams]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Delete ${ids.length} selected item${ids.length === 1 ? "" : "s"} permanently?`,
      )
    ) {
      return;
    }
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/photos/${encodeURIComponent(id)}`, { method: "DELETE" }),
      ),
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      window.alert(
        `Could not delete ${failed.length} item(s). Check your session and try again.`,
      );
      return;
    }
    const remove = new Set(ids);
    setSelectedIds(new Set());
    setPhotos((prev) => prev?.filter((p) => !remove.has(p.id)) ?? null);
    setTotal((t) => Math.max(0, t - ids.length));
  }, [selectedIds]);

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
          void load();
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

  const showGallery =
    !moderation ||
    (moderationChecked &&
      (moderationOk || !moderationConfigured));
  const moderationActive =
    moderation && moderationConfigured && moderationOk;

  return (
    <>
      <ScrollToTop />
      <main className="mx-auto max-w-[1960px] px-4 pb-16 pt-4 sm:px-6">
        {errorBanner}

        {moderation && moderationChecked && !moderationConfigured && (
          <div
            role="alert"
            className="mx-auto mb-6 max-w-lg rounded-xl bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100 ring-1 ring-amber-500/30"
          >
            Moderation sign-in is not configured (set MODERATION_SECRET and
            MODERATION_PASSWORD on the server).
          </div>
        )}

        {moderation &&
          moderationChecked &&
          moderationConfigured &&
          !moderationOk && (
          <ModerationLogin
            onSuccess={() => {
              setModerationOk(true);
              void load();
            }}
          />
        )}

        {showGallery && (
          <>
            <PhotoGallery
              lead={
                moderation ? (
                  <div className="relative mb-4 break-inside-avoid sm:mb-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <Link
                        href={homeHref}
                        className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-stone-100 backdrop-blur-sm transition hover:bg-white/10"
                      >
                        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                        Back to home
                      </Link>
                      {moderationActive && selectedIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => void deleteSelected()}
                          className="inline-flex w-fit items-center rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-950/80"
                        >
                          Delete selected ({selectedIds.size})
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ShareMomentGridBlock
                    onUploadSuccess={(uploaded) => {
                      if (uploaded?.length) mergeUploadedPhotos(uploaded);
                      else void load();
                    }}
                  />
                )
              }
              photos={photos}
              photosLoading={photos === null && !error}
              preserveSearchParams={preserveUrlParams}
              moderationMode={moderationActive}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />

            {photos !== null && photos.length < total && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadMore()}
                  className="rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-stone-100 transition hover:bg-white/15"
                >
                  Load more ({photos.length} / {total})
                </button>
              </div>
            )}
          </>
        )}

        {photos && photos.length > 0 && showGallery && (
          <PhotoModal
            photos={photos}
            preserveSearchParams={preserveUrlParams}
            moderation={moderationActive}
            onPhotosReload={load}
          />
        )}
      </main>
    </>
  );
}
