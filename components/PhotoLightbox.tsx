"use client";

import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import type { Photo } from "@/lib/types/photo";
import { variants } from "@/utils/animationVariants";
import downloadPhoto from "@/utils/downloadPhoto";

type Props = {
  photos: Photo[];
  index: number;
  direction: number;
  changeIndex: (newIndex: number) => void;
  closeModal: () => void;
  /** Moderation mode: delete control (shown when provided). */
  onDeletePhoto?: (photo: Photo) => Promise<void>;
};

function downloadExt(photo: Photo): string {
  const fromName = photo.filename.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) {
    return fromName.replace("jpeg", "jpg");
  }
  return photo.kind === "video" ? "mp4" : "jpg";
}

export default function PhotoLightbox({
  photos,
  index,
  direction,
  changeIndex,
  closeModal,
  onDeletePhoto,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mobileUiOpen, setMobileUiOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const current = photos[index];

  const start = Math.max(0, index - 15);
  const end = Math.min(photos.length, index + 16);
  const windowed = photos.slice(start, end);

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  useEffect(() => {
    setMobileUiOpen(false);
  }, [index]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!thumbStripRef.current || isMobile) return;
    const el = thumbStripRef.current.querySelector<HTMLElement>(
      `[data-thumb-index="${index}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index, isMobile, photos.length]);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (index < photos.length - 1) changeIndex(index + 1);
    },
    onSwipedRight: () => {
      if (index > 0) changeIndex(index - 1);
    },
    trackMouse: true,
  });

  if (!current) return null;

  const ext = downloadExt(current);

  const sharePhoto = async () => {
    const pageUrl = new URL(current.url, window.location.origin).href;
    const name = current.filename || `${current.kind}.${ext}`;
    const defaultShareType =
      current.kind === "video" ? "video/mp4" : "image/jpeg";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const res = await fetch(current.url);
          const blob = await res.blob();
          const file = new File([blob], name, {
            type: blob.type || defaultShareType,
          });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: name });
            return;
          }
        } catch {
          /* fall through to URL-only share */
        }
        await navigator.share({ title: name, url: pageUrl });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pageUrl);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      try {
        await navigator.clipboard?.writeText(pageUrl);
      } catch {
        /* ignore */
      }
    }
  };

  const isVideo = current.kind === "video";

  const deleteCurrent = async () => {
    if (!onDeletePhoto || deleting) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this item permanently?")
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onDeletePhoto(current);
    } finally {
      setDeleting(false);
    }
  };

  const showChrome = loaded && (!isMobile || mobileUiOpen);

  return (
    <MotionConfig
      transition={{
        opacity: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
        x: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
      }}
    >
      <div
        className="relative z-50 flex w-full max-w-7xl flex-col items-center px-2 pt-[max(0.5rem,var(--album-safe-top))] wide:max-h-[min(90vh,100dvh)]"
        {...handlers}
      >
        <div className="w-full overflow-hidden">
          <div className="relative mx-auto flex min-h-[40vh] w-full max-w-5xl items-center justify-center sm:min-h-[50vh]">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={current.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative flex w-full items-center justify-center"
                onClick={() => {
                  if (!isMobile || isVideo) return;
                  setMobileUiOpen((v) => !v);
                }}
              >
                {isVideo ? (
                  <div
                    className={`relative flex w-full max-w-5xl items-center justify-center px-1 ${
                      isMobile && mobileUiOpen ? "brightness-[0.45]" : ""
                    } transition-[filter] duration-200`}
                  >
                    <video
                      key={current.id}
                      src={current.url}
                      controls
                      playsInline
                      className="max-h-[min(70vh,85dvh)] max-w-full rounded-lg object-contain"
                      onLoadedData={() => setLoaded(true)}
                      onCanPlay={() => setLoaded(true)}
                    />
                    {isMobile && !mobileUiOpen && (
                      <button
                        type="button"
                        className="absolute inset-0 z-10"
                        aria-label="Show actions"
                        onClick={() => setMobileUiOpen(true)}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className={`relative aspect-[4/3] w-full max-h-[min(70vh,85dvh)] sm:aspect-[3/2] ${
                      isMobile && mobileUiOpen ? "brightness-[0.45]" : ""
                    } transition-[filter] duration-200`}
                  >
                    <Image
                      src={current.url}
                      alt={current.filename}
                      fill
                      priority
                      className="object-contain"
                      unoptimized
                      onLoadingComplete={() => setLoaded(true)}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-7xl items-center justify-center">
          {showChrome && (
            <div className="relative h-full w-full max-w-5xl pointer-events-auto">
              {index > 0 && (
                <button
                  type="button"
                  className="absolute left-1 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 sm:left-3 sm:flex"
                  style={{ transform: "translate3d(0, -50%, 0)" }}
                  onClick={() => changeIndex(index - 1)}
                  aria-label="Previous"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
              )}
              {index + 1 < photos.length && (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 sm:right-3 sm:flex"
                  style={{ transform: "translate3d(0, -50%, 0)" }}
                  onClick={() => changeIndex(index + 1)}
                  aria-label="Next"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              )}
              <div
                className={`absolute z-50 flex flex-wrap items-center justify-end gap-2 sm:right-3 sm:top-3 ${
                  isMobile
                    ? "right-2 top-[max(0.5rem,var(--album-safe-top))] max-w-[min(100%,12rem)]"
                    : "right-1 top-[max(0.5rem,var(--album-safe-top))]"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => void deleteCurrent()}
                    disabled={deleting}
                    className="rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-red-950/70 disabled:opacity-50 min-h-11 min-w-11 flex items-center justify-center"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
                <a
                  href={current.url}
                  className="rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center"
                  target="_blank"
                  title="Open full size in new tab"
                  rel="noreferrer"
                  aria-label="Open full size in new tab"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                </a>
                <button
                  type="button"
                  onClick={() => void sharePhoto()}
                  className="rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center"
                  title="Share"
                  aria-label="Share"
                >
                  <ShareIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadPhoto(
                      current.url,
                      current.filename || `${current.kind}.${ext}`,
                    )
                  }
                  className="rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center"
                  title="Download"
                  aria-label="Download"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                {isMobile && (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center"
                    aria-label="Close viewer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="absolute left-1 top-[max(0.5rem,var(--album-safe-top))] z-50 hidden sm:left-3 sm:top-3 sm:block">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center"
                  aria-label="Close viewer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="fixed inset-x-0 bottom-0 z-40 hidden overflow-hidden bg-gradient-to-b from-black/0 to-black/60 pb-[max(0.75rem,var(--album-safe-bottom))] pt-4 sm:block"
          style={{ paddingBottom: "max(0.75rem, var(--album-safe-bottom))" }}
        >
          <motion.div
            ref={thumbStripRef}
            initial={false}
            className="mx-auto flex h-16 max-w-full gap-1 overflow-x-auto scroll-smooth px-2 sm:h-20 sm:px-4"
          >
            <AnimatePresence initial={false}>
              {windowed.map((photo, i) => {
                const globalIndex = start + i;
                const active = globalIndex === index;
                return (
                  <motion.button
                    initial={false}
                    layout={false}
                    type="button"
                    key={photo.id}
                    data-thumb-index={globalIndex}
                    onClick={() => changeIndex(globalIndex)}
                    aria-label={`View item ${globalIndex + 1}`}
                    aria-current={active ? "true" : undefined}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md sm:h-[4.5rem] sm:w-28 ${
                      active
                        ? "z-20 ring-2 ring-white ring-offset-2 ring-offset-black/40"
                        : "z-10 opacity-60 hover:opacity-90"
                    }`}
                  >
                    {photo.kind === "video" ? (
                      <video
                        src={photo.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                        aria-hidden
                      />
                    ) : (
                      <Image
                        alt=""
                        src={photo.url}
                        width={180}
                        height={120}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
