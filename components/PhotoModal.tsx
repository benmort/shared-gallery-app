"use client";

import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import useKeypress from "react-use-keypress";
import type { Photo } from "@/lib/types/photo";
import { useLastViewedPhoto } from "@/utils/useLastViewedPhoto";
import { galleryPath } from "@/utils/galleryUrl";
import PhotoLightbox from "./PhotoLightbox";

type Props = {
  photos: Photo[];
  /** Keep e.g. `showreel=true` when navigating lightbox / close. */
  preserveSearchParams?: Record<string, string> | null;
  moderation?: boolean;
  onPhotosReload?: () => Promise<void>;
};

export default function PhotoModal({
  photos,
  preserveSearchParams,
  moderation = false,
  onPhotosReload,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const photoId = searchParams?.get("photoId") ?? null;
  const [, setLastViewedPhoto] = useLastViewedPhoto();
  const pendingPhotoIdRef = useRef<string | null | undefined>(undefined);
  const [, startTransition] = useTransition();

  const [activePhotoId, setActivePhotoId] = useState<string | null>(photoId);
  const preserve = preserveSearchParams ?? null;

  useEffect(() => {
    const pendingPhotoId = pendingPhotoIdRef.current;
    if (pendingPhotoId !== undefined) {
      if (photoId === pendingPhotoId) {
        pendingPhotoIdRef.current = undefined;
      }
      return;
    }
    setActivePhotoId(photoId);
  }, [photoId]);

  const index = useMemo(
    () => (activePhotoId ? photos.findIndex((p) => p.id === activePhotoId) : -1),
    [activePhotoId, photos],
  );

  const open = index >= 0;

  const syncPhotoId = useCallback(
    (nextPhotoId: string | null) => {
      pendingPhotoIdRef.current = nextPhotoId;
      startTransition(() => {
        router.replace(galleryPath(nextPhotoId, preserve), { scroll: false });
      });
    },
    [preserve, router, startTransition],
  );

  const handleClose = useCallback(() => {
    if (activePhotoId) setLastViewedPhoto(activePhotoId);
    setActivePhotoId(null);
    syncPhotoId(null);
  }, [activePhotoId, setLastViewedPhoto, syncPhotoId]);

  const changeIndex = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= photos.length) return;
      if (newIndex === index) return;
      const nextPhotoId = photos[newIndex]?.id;
      if (!nextPhotoId) return;
      setActivePhotoId(nextPhotoId);
      syncPhotoId(nextPhotoId);
    },
    [index, photos, syncPhotoId],
  );

  const handleDeletePhoto =
    moderation && onPhotosReload
      ? async (photo: Photo) => {
          const res = await fetch(
            `/api/photos/${encodeURIComponent(photo.id)}`,
            { method: "DELETE" },
          );
          if (!res.ok) {
            if (res.status === 401) {
              window.alert(
                "Moderation session expired or missing. Sign in again with the moderation password.",
              );
              return;
            }
            window.alert("Couldn’t delete this item. Try again.");
            return;
          }
          const idx = photos.findIndex((p) => p.id === photo.id);
          const remaining = photos.filter((p) => p.id !== photo.id);
          if (remaining.length === 0) {
            setActivePhotoId(null);
            syncPhotoId(null);
          } else if (idx >= 0 && idx < remaining.length) {
            setActivePhotoId(remaining[idx].id);
            syncPhotoId(remaining[idx].id);
          } else {
            const fallback = remaining[remaining.length - 1];
            if (fallback) {
              setActivePhotoId(fallback.id);
              syncPhotoId(fallback.id);
            }
          }
          await onPhotosReload();
        }
      : undefined;

  useKeypress("ArrowRight", () => {
    if (open && index + 1 < photos.length) changeIndex(index + 1);
  });

  useKeypress("ArrowLeft", () => {
    if (open && index > 0) changeIndex(index - 1);
  });

  if (!open) return null;

  return (
    <Dialog
      static
      open={open}
      onClose={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <Dialog.Overlay
        as={motion.div}
        key="backdrop"
        className="fixed inset-0 z-40 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <div className="relative z-50 flex w-full justify-center">
        <PhotoLightbox
          photos={photos}
          index={index}
          changeIndex={changeIndex}
          closeModal={handleClose}
          onDeletePhoto={handleDeletePhoto}
        />
      </div>
    </Dialog>
  );
}
