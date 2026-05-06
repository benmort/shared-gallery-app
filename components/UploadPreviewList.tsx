"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { canRemoveFromQueue, queueStatusLabel } from "@/lib/upload-queue-ui";

export type PreviewStatus = "queued" | "uploading" | "uploaded" | "failed";

export type PreviewItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: PreviewStatus;
  error?: string;
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
          {item.file.type.startsWith("video/") ? (
            <video
              src={item.previewUrl}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              aria-hidden
            />
          ) : (
            <Image
              src={item.previewUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="120px"
            />
          )}
          <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded-md bg-black/55 px-1.5 py-1 text-[10px] font-medium text-white">
            {queueStatusLabel(item.status)}
          </div>
          {item.status === "uploading" ? (
            <span
              className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white"
              aria-label={`${item.file.name} uploading`}
            >
              <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden />
            </span>
          ) : null}
          {item.status === "uploaded" ? (
            <span
              className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white"
              aria-label={`${item.file.name} uploaded`}
            >
              <CheckCircleIcon className="h-6 w-6" aria-hidden />
            </span>
          ) : null}
          {item.status === "failed" ? (
            <span
              className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white"
              aria-label={`${item.file.name} failed`}
              title={item.error || "Upload failed"}
            >
              <ExclamationTriangleIcon className="h-6 w-6" aria-hidden />
            </span>
          ) : null}
          {canRemoveFromQueue(item.status, disabled) ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(item.id)}
              className="absolute right-1 top-1 flex h-12 min-w-12 items-center justify-center rounded-full border border-white/20 bg-black/55 text-2xl font-semibold leading-none text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-40"
              aria-label={`Remove ${item.file.name}`}
            >
              ×
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
