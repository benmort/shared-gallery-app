"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";

export type PreviewItemStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "done"
  | "failed";

export type PreviewItem = {
  id: string;
  uploadId: string;
  file: File;
  previewUrl: string;
  status: PreviewItemStatus;
  progress: number;
  error?: string;
};

type Props = {
  items: PreviewItem[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  disabled?: boolean;
  showRemove?: boolean;
};

export default function UploadPreviewList({
  items,
  onRemove,
  onRetry,
  disabled,
  showRemove = true,
}: Props) {
  if (!items.length) return null;

  const statusLabel = (item: PreviewItem): string => {
    if (item.status === "uploading") {
      return `Uploading ${Math.round(item.progress * 100)}%`;
    }
    if (item.status === "processing") return "Processing";
    if (item.status === "done") return "Uploaded";
    if (item.status === "failed") return "Upload failed";
    return "Queued";
  };

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
          <div className="pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white">
            {item.file.type.startsWith("video/") ? (
              <>
                <PlayIcon className="h-3 w-3" aria-hidden />
                Video
              </>
            ) : (
              "Image"
            )}
          </div>
          {showRemove && item.status === "queued" ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(item.id)}
              className="absolute right-1 top-1 z-20 flex h-12 min-w-12 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition hover:bg-black/85 disabled:opacity-40"
              aria-label={`Remove ${item.file.name}`}
            >
              <XMarkIcon className="h-8 w-8" aria-hidden />
            </button>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/60 px-2 py-1 text-[10px] font-medium text-white">
            {statusLabel(item)}
          </div>
          {item.status !== "queued" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
              {item.status === "uploading" || item.status === "processing" ? (
                <ArrowPathIcon className="h-8 w-8 animate-spin text-white" aria-hidden />
              ) : null}
              {item.status === "done" ? (
                <CheckCircleIcon className="h-9 w-9 text-emerald-300" aria-hidden />
              ) : null}
              {item.status === "failed" ? (
                <div className="flex flex-col items-center gap-1">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-300" aria-hidden />
                  {onRetry ? (
                    <button
                      type="button"
                      onClick={() => onRetry(item.id)}
                      className="pointer-events-auto rounded-md bg-red-500/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-red-500"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
