"use client";

import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ShareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import type { Photo } from "@/lib/types/photo";
import { lightboxImageSrcSet } from "@/utils/lightboxImageSrcSet";
import { variants } from "@/utils/animationVariants";
import downloadPhoto from "@/utils/downloadPhoto";

const FW_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const EASE = [0.32, 0.72, 0, 1] as const;
const DEFAULT_TRANSITION = {
  opacity: { duration: 0.18, ease: EASE },
};
const REDUCED_TRANSITION = { opacity: { duration: 0.12 } };
const REDUCED_VARIANTS = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};
const VIDEO_POSTER_FALLBACK = "/images/video-poster-fallback.svg";

type Props = {
  photos: Photo[];
  index: number;
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
  changeIndex,
  closeModal,
  onDeletePhoto,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileUiOpen, setMobileUiOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const mediaViewportRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const touchPanStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const current = photos[index];

  const start = Math.max(0, index - 15);
  const end = Math.min(photos.length, index + 16);
  const windowed = photos.slice(start, end);

  const clampZoom = useCallback((value: number) => {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(value.toFixed(2))));
  }, []);

  const clampPan = useCallback((x: number, y: number, zoomLevel: number) => {
    const viewport = mediaViewportRef.current;
    if (!viewport || zoomLevel <= 1) return { x: 0, y: 0 };
    const maxX = (viewport.clientWidth * (zoomLevel - 1)) / 2;
    const maxY = (viewport.clientHeight * (zoomLevel - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const updateZoom = useCallback(
    (nextZoom: number) => {
      const clamped = clampZoom(nextZoom);
      setZoom(clamped);
      if (clamped <= 1) {
        setPan({ x: 0, y: 0 });
        return;
      }
      setPan((currentPan) => clampPan(currentPan.x, currentPan.y, clamped));
    },
    [clampPan, clampZoom],
  );

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsPanning(false);
    panStartRef.current = null;
    touchPanStartRef.current = null;
    pinchStartRef.current = null;
  }, []);

  useEffect(() => {
    setLoaded(false);
    resetZoom();
  }, [index, resetZoom]);

  useEffect(() => {
    setMobileUiOpen(false);
  }, [index]);

  useEffect(() => {
    setPan((currentPan) => clampPan(currentPan.x, currentPan.y, zoom));
  }, [clampPan, zoom]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!thumbStripRef.current || isMobile) return;
    const strip = thumbStripRef.current;
    const el = strip.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`);
    if (!el) return;
    const targetLeft = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2;
    const maxLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const left = Math.max(0, Math.min(maxLeft, targetLeft));
    strip.scrollTo({ left, behavior: "auto" });
  }, [index, isMobile, photos.length]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDeleteConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDeleteConfirm]);

  const onMediaPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (zoom <= 1 || event.pointerType === "touch") return;
    if (event.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onMediaPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isPanning || !panStartRef.current) return;
    event.preventDefault();
    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;
    setPan(
      clampPan(
        panStartRef.current.originX + deltaX,
        panStartRef.current.originY + deltaY,
        zoom,
      ),
    );
  };

  const onMediaPointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
    panStartRef.current = null;
  };

  const onMediaWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (isVideo) return;
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    updateZoom(zoom + direction * ZOOM_STEP);
  };

  const touchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0]!.clientX - touches[1]!.clientX;
    const dy = touches[0]!.clientY - touches[1]!.clientY;
    return Math.hypot(dx, dy);
  };

  const onMediaTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (isVideo) return;
    if (event.touches.length >= 2) {
      touchPanStartRef.current = null;
      pinchStartRef.current = { distance: touchDistance(event.touches), zoom };
      return;
    }
    if (event.touches.length === 1 && zoom > 1) {
      const touch = event.touches[0];
      if (!touch) return;
      touchPanStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      setIsPanning(true);
    }
  };

  const onMediaTouchMove: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (isVideo) return;
    if (event.touches.length >= 2 && pinchStartRef.current) {
      event.preventDefault();
      const nextDistance = touchDistance(event.touches);
      if (!pinchStartRef.current.distance) return;
      const scale = nextDistance / pinchStartRef.current.distance;
      updateZoom(pinchStartRef.current.zoom * scale);
      return;
    }
    if (event.touches.length === 1 && zoom > 1 && touchPanStartRef.current) {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      const deltaX = touch.clientX - touchPanStartRef.current.x;
      const deltaY = touch.clientY - touchPanStartRef.current.y;
      setPan(
        clampPan(
          touchPanStartRef.current.originX + deltaX,
          touchPanStartRef.current.originY + deltaY,
          zoom,
        ),
      );
    }
  };

  const onMediaTouchEnd: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (event.touches.length < 2) {
      pinchStartRef.current = null;
    }
    if (event.touches.length === 0) {
      touchPanStartRef.current = null;
      setIsPanning(false);
      return;
    }
    if (event.touches.length === 1 && zoom > 1) {
      const touch = event.touches[0];
      if (!touch) return;
      touchPanStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      return;
    }
    touchPanStartRef.current = null;
    setIsPanning(false);
  };

  const onSwipedLeft = useCallback(() => {
    if (zoom > 1) return;
    if (index < photos.length - 1) changeIndex(index + 1);
  }, [changeIndex, index, photos.length, zoom]);

  const onSwipedRight = useCallback(() => {
    if (zoom > 1) return;
    if (index > 0) changeIndex(index - 1);
  }, [changeIndex, index, zoom]);

  const swipeConfig = useMemo(
    () => ({
      onSwipedLeft,
      onSwipedRight,
      trackMouse: zoom <= 1,
      trackTouch: zoom <= 1,
    }),
    [onSwipedLeft, onSwipedRight, zoom],
  );
  const handlers = useSwipeable(swipeConfig);

  if (!current) return null;

  const ext = downloadExt(current);

  const imageFetchUrl = current.displayUrl ?? current.url;

  const sharePhoto = async () => {
    const pageUrl = new URL(current.url, window.location.origin).href;
    const name = current.filename || `${current.kind}.${ext}`;
    const defaultShareType =
      current.kind === "video" ? "video/mp4" : "image/jpeg";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const res = await fetch(imageFetchUrl);
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

  const runDelete = async () => {
    if (!onDeletePhoto || deleting) return;
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await onDeletePhoto(current);
    } finally {
      setDeleting(false);
    }
  };

  const showChrome = loaded && (!isMobile || mobileUiOpen);
  const motionTransition = reduceMotion ? REDUCED_TRANSITION : DEFAULT_TRANSITION;
  const slideVariants = reduceMotion ? REDUCED_VARIANTS : variants;

  return (
    <>
    <MotionConfig
      transition={motionTransition}
    >
      <div
        className="relative z-50 flex w-full max-w-7xl flex-col items-center px-2 pt-[max(0.5rem,var(--album-safe-top))] wide:max-h-[min(90vh,100dvh)]"
        {...handlers}
      >
        <div className="w-full overflow-hidden">
          <div className="relative mx-auto flex min-h-[40vh] w-full max-w-5xl items-center justify-center sm:min-h-[50vh]">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={current.id}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative flex w-full items-center justify-center will-change-opacity"
                role={isMobile && !isVideo ? "button" : undefined}
                tabIndex={isMobile && !isVideo ? 0 : undefined}
                aria-expanded={
                  isMobile && !isVideo ? mobileUiOpen : undefined
                }
                aria-label={
                  isMobile && !isVideo
                    ? "Show or hide photo actions"
                    : undefined
                }
                onClick={() => {
                  if (!isMobile || isVideo || zoom > 1) return;
                  setMobileUiOpen((v) => !v);
                }}
                onKeyDown={(e) => {
                  if (!isMobile || isVideo || zoom > 1) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMobileUiOpen((v) => !v);
                  }
                }}
              >
                {isVideo ? (
                  <div
                    className={`relative flex w-full max-w-5xl items-center justify-center px-1 ${
                      isMobile && mobileUiOpen ? "brightness-[0.45]" : ""
                    }`}
                  >
                    <video
                      key={current.id}
                      src={current.url}
                      controls
                      playsInline
                      preload="metadata"
                      poster={current.thumbUrl ?? VIDEO_POSTER_FALLBACK}
                      className="max-h-[min(70vh,85dvh)] max-w-full rounded-lg object-contain"
                      onLoadedData={() => setLoaded(true)}
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
                    ref={mediaViewportRef}
                    className={`relative aspect-[4/3] w-full max-h-[min(70vh,85dvh)] sm:aspect-[3/2] ${
                      isMobile && mobileUiOpen ? "brightness-[0.45]" : ""
                    } ${
                      zoom > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : ""
                    }`}
                    onWheel={onMediaWheel}
                    onPointerDown={onMediaPointerDown}
                    onPointerMove={onMediaPointerMove}
                    onPointerUp={onMediaPointerUp}
                    onPointerCancel={onMediaPointerUp}
                    onTouchStart={onMediaTouchStart}
                    onTouchMove={onMediaTouchMove}
                    onTouchEnd={onMediaTouchEnd}
                    style={{ touchAction: zoom > 1 ? "none" : "auto" }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                        transformOrigin: "center center",
                        transition: isPanning ? "none" : "transform 140ms ease-out",
                      }}
                    >
                      {lightboxImageSrcSet(current) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- responsive srcSet for variants
                        <img
                          src={current.displayUrl ?? current.url}
                          srcSet={lightboxImageSrcSet(current)}
                          sizes="(max-width: 640px) 100vw, min(90vw, 1280px)"
                          alt={current.filename}
                          className="absolute inset-0 h-full w-full object-contain"
                          onLoad={() => setLoaded(true)}
                          decoding="async"
                        />
                      ) : (
                        <Image
                          src={imageFetchUrl}
                          alt={current.filename}
                          fill
                          loading="eager"
                          className="object-contain"
                          unoptimized
                          onLoadingComplete={() => setLoaded(true)}
                        />
                      )}
                    </div>
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
                  className={`absolute left-1 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 sm:left-3 sm:flex ${FW_RING}`}
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
                  className={`absolute right-1 top-1/2 z-50 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 sm:right-3 sm:flex ${FW_RING}`}
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
                {!isVideo ? (
                  <>
                    <button
                      type="button"
                      onClick={() => updateZoom(zoom - ZOOM_STEP)}
                      disabled={zoom <= MIN_ZOOM}
                      className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 disabled:opacity-50 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
                      title="Zoom out"
                      aria-label="Zoom out"
                    >
                      <MagnifyingGlassMinusIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateZoom(zoom + ZOOM_STEP)}
                      disabled={zoom >= MAX_ZOOM}
                      className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 disabled:opacity-50 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
                      title="Zoom in"
                      aria-label="Zoom in"
                    >
                      <MagnifyingGlassPlusIcon className="h-5 w-5" />
                    </button>
                    {zoom > MIN_ZOOM ? (
                      <button
                        type="button"
                        onClick={resetZoom}
                        className={`rounded-full bg-black/50 px-3 py-2 text-[11px] font-semibold text-white/95 backdrop-blur-lg transition hover:bg-black/75 min-h-11 ${FW_RING}`}
                        title="Reset zoom"
                        aria-label="Reset zoom"
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                    ) : null}
                  </>
                ) : null}
                {onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                    className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-red-950/70 disabled:opacity-50 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
                    title="Delete"
                    aria-label="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
                <a
                  href={current.url}
                  className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
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
                  className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
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
                  className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
                  title="Download"
                  aria-label="Download"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                {isMobile && (
                  <button
                    type="button"
                    onClick={closeModal}
                    className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
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
                  className={`rounded-full bg-black/50 p-2.5 text-white/90 backdrop-blur-lg transition hover:bg-black/75 min-h-11 min-w-11 flex items-center justify-center ${FW_RING}`}
                  aria-label="Close viewer"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className="fixed inset-x-0 bottom-0 z-40 hidden bg-gradient-to-b from-black/0 to-black/60 pb-[max(0.75rem,var(--album-safe-bottom))] pt-4 sm:block"
          style={{ paddingBottom: "max(0.75rem, var(--album-safe-bottom))" }}
        >
          <motion.div
            ref={thumbStripRef}
            initial={false}
            className="mx-auto flex h-16 max-w-full items-center gap-1 overflow-x-auto overflow-y-visible px-2 py-1 sm:h-20 sm:px-4"
          >
            {windowed.map((photo, i) => {
              const globalIndex = start + i;
              const active = globalIndex === index;
              return (
                <button
                  type="button"
                  key={photo.id}
                  data-thumb-index={globalIndex}
                  onClick={() => changeIndex(globalIndex)}
                  aria-label={`View item ${globalIndex + 1}`}
                  aria-current={active ? "true" : undefined}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md sm:h-[4.5rem] sm:w-28 ${FW_RING} ${
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
                      poster={photo.thumbUrl ?? VIDEO_POSTER_FALLBACK}
                      className="h-full w-full object-cover"
                      aria-hidden
                    />
                  ) : (
                    <Image
                      alt=""
                      src={photo.thumbUrl ?? photo.url}
                      width={180}
                      height={120}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </MotionConfig>

    {mounted &&
      showDeleteConfirm &&
      createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-stone-900 px-4 py-5 text-stone-100 shadow-xl ring-1 ring-white/10">
            <h2
              id="delete-confirm-title"
              className="text-lg font-semibold text-white"
            >
              Delete this item?
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              This cannot be undone. The file will be removed from the album.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={`rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-stone-100 transition hover:bg-white/10 ${FW_RING}`}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 ${FW_RING}`}
                disabled={deleting}
                onClick={() => void runDelete()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
