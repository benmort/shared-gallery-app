"use client";

import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import PhotoLightbox from "@/components/PhotoLightbox";
import type { Photo } from "@/lib/types/photo";
import type { SummitVenueGalleryItem } from "@/lib/summit/venue-gallery";

type Props = {
  items: SummitVenueGalleryItem[];
};

export default function SummitVenueMapGallery({ items }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const photos = useMemo<Photo[]>(
    () =>
      items.map((item, index) => ({
        id: item.id,
        filename: item.title,
        url: item.src,
        displayUrl: item.src,
        thumbUrl: item.src,
        uploadedAt: `venue-gallery-${index}`,
        kind: "image",
      })),
    [items],
  );

  if (!items.length) return null;

  const open = activeIndex !== null;
  const index = activeIndex ?? 0;

  const changeIndex = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= photos.length) return;
    if (newIndex === index) return;
    setActiveIndex(newIndex);
  };

  return (
    <>
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-white">Venue Maps</h2>
        <p className="mt-2 text-sm text-stone-300">
          Tap or click a map to open the full-screen viewer.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(itemIndex)}
              className="group overflow-hidden rounded-lg border border-white/10 bg-zinc-900/60 text-left transition hover:border-white/25 hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
            >
              <div className="relative h-40 w-full bg-black/30">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-contain p-2"
                />
              </div>
              <p className="px-3 pb-3 pt-2 text-xs font-medium uppercase tracking-[0.12em] text-stone-200">
                {item.title}
              </p>
            </button>
          ))}
        </div>
      </section>

      {open ? (
        <Dialog
          static
          open={open}
          onClose={() => setActiveIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <Dialog.Overlay
            as={motion.div}
            key="venue-backdrop"
            className="fixed inset-0 z-40 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="relative z-50 flex w-full justify-center">
            <PhotoLightbox
              photos={photos}
              index={index}
              changeIndex={changeIndex}
              closeModal={() => setActiveIndex(null)}
            />
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
