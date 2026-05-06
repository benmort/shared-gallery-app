"use client";

import { Dialog } from "@headlessui/react";
import { ArrowDownTrayIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

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

  const loadMoreInFlight = useRef(false);

  const loadMore = useCallback(() => {
    if (loadMoreInFlight.current || !photos || photos.length >= total) return;
    loadMoreInFlight.current = true;
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
      })
      .finally(() => {
        loadMoreInFlight.current = false;
      });
  }, [photos, total, normalizePhoto]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || photos === null || photos.length >= total) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.length > 0 && entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [photos, total, loadMore]);

  const mergeUploadedPhotos = useCallback(
    (uploaded: Photo[]) => {
      if (!uploaded.length) return;
      const normalized = uploaded.map(normalizePhoto);
      let added = normalized.length;
      setPhotos((prev) => {
        if (!prev) return normalized;
        const ids = new Set(normalized.map((p) => p.id));
        const existing = new Set(prev.map((p) => p.id));
        added = normalized.filter((p) => !existing.has(p.id)).length;
        return [...normalized, ...prev.filter((p) => !ids.has(p.id))];
      });
      setTotal((t) => t + added);
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

  const performBulkDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
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
  }, []);

  const confirmDeleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    setDeleteConfirmOpen(false);
    if (ids.length === 0) return;
    await performBulkDelete(ids);
  }, [selectedIds, performBulkDelete]);

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
      <main className="mx-auto w-full max-w-[460px] px-0 pb-16 pt-3 sm:max-w-[1024px] sm:px-0 sm:pt-5 lg:max-w-[1240px]">
        {errorBanner}

        {moderation && moderationChecked && !moderationConfigured && (
          <div
            role="alert"
            className="mx-auto mb-6 max-w-lg rounded-xl bg-amber-950/40 px-4 py-3 text-center text-sm text-amber-100 ring-1 ring-amber-500/30"
          >
            <p className="font-medium">Moderation is not configured on this server.</p>
            <p className="mt-2 text-amber-100/90">
              Set <code className="rounded bg-black/30 px-1 py-0.5 text-xs">MODERATION_SECRET</code>{" "}
              (16+ characters) and{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">MODERATION_PASSWORD</code>{" "}
              (8+ characters). Locally: add them to{" "}
              <code className="rounded bg-black/30 px-1 py-0.5 text-xs">.env.local</code> and restart
              the dev server. On Vercel: Project → Settings → Environment Variables, then redeploy.
            </p>
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
                    <div className="flex w-full flex-col gap-3">
                      <Link
                        href={homeHref}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-stone-100 backdrop-blur-sm transition hover:bg-white/10"
                      >
                        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
                        BACK TO HOME
                      </Link>
                      {moderationActive && selectedIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-950/80"
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
              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
                <div
                  ref={loadMoreSentinelRef}
                  className="h-px w-full max-w-md"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => loadMore()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-zinc-900/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-100 transition hover:bg-zinc-800/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/80"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden />
                  Load more moments
                </button>
                <p className="text-[11px] text-stone-500">
                  Showing {photos.length} of {total}
                </p>
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

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        className="relative z-[200]"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900/95 p-5 shadow-xl ring-1 ring-white/10 sm:p-6">
              <Dialog.Title className="text-balance text-center text-base font-semibold leading-snug text-stone-100 sm:text-lg">
                Delete {selectedIds.size} selected item
                {selectedIds.size === 1 ? "" : "s"} permanently?
              </Dialog.Title>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-stone-100 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteSelected()}
                  className="rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-2.5 text-sm font-medium text-red-100 transition hover:bg-red-950/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
                >
                  Delete
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
