"use client";

import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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

  const index = useMemo(
    () => (photoId ? photos.findIndex((p) => p.id === photoId) : -1),
    [photoId, photos],
  );

  const open = index >= 0;
  const [direction, setDirection] = useState(0);

  const handleClose = () => {
    if (photoId) setLastViewedPhoto(photoId);
    router.replace(galleryPath(null, preserveSearchParams ?? null), {
      scroll: false,
    });
  };

  const changeIndex = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= photos.length) return;
    if (newIndex === index) return;
    setDirection(newIndex > index ? 1 : -1);
    const id = photos[newIndex]?.id;
    if (id) {
      router.replace(galleryPath(id, preserveSearchParams ?? null), {
        scroll: false,
      });
    }
  };

  const preserve = preserveSearchParams ?? null;

  const handleDeletePhoto =
    moderation && onPhotosReload
      ? async (photo: Photo) => {
          const res = await fetch(
            `/api/photos/${encodeURIComponent(photo.id)}`,
            { method: "DELETE" },
          );
          if (!res.ok) {
            window.alert("Couldn’t delete this item. Try again.");
            return;
          }
          const idx = photos.findIndex((p) => p.id === photo.id);
          const remaining = photos.filter((p) => p.id !== photo.id);
          if (remaining.length === 0) {
            router.replace(galleryPath(null, preserve), { scroll: false });
          } else if (idx >= 0 && idx < remaining.length) {
            router.replace(galleryPath(remaining[idx].id, preserve), {
              scroll: false,
            });
          } else {
            router.replace(
              galleryPath(remaining[remaining.length - 1].id, preserve),
              { scroll: false },
            );
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
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <div className="relative z-50 flex w-full justify-center">
        <PhotoLightbox
          photos={photos}
          index={index}
          direction={direction}
          changeIndex={changeIndex}
          closeModal={handleClose}
          onDeletePhoto={handleDeletePhoto}
        />
      </div>
    </Dialog>
  );
}
