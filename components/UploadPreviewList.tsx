"use client";

import Image from "next/image";

export type PreviewItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type Props = {
  items: PreviewItem[];
  onRemove: (id: string) => void;
  disabled?: boolean;
};

export default function UploadPreviewList({
  items,
  onRemove,
  disabled,
}: Props) {
  if (!items.length) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="list">
      {items.map((item) => (
        <li
          key={item.id}
          className="relative aspect-square overflow-hidden rounded-xl bg-stone-100 shadow-sm"
        >
          <Image
            src={item.previewUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
            sizes="120px"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(item.id)}
            className="absolute right-1 top-1 flex h-9 min-w-9 items-center justify-center rounded-full bg-black/55 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-40"
            aria-label={`Remove ${item.file.name}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
