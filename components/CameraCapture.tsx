"use client";

import { CameraIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { useId, useRef, useState } from "react";
import { validateImageFile, validateVideoFile } from "@/lib/client-validate";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Lighter text and controls when placed on a dark hero card */
  onDark?: boolean;
};

export default function CameraCapture({
  onFiles,
  disabled,
  onDark,
}: Props) {
  const photoInputId = useId();
  const videoInputId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const btnClass = (flex1: boolean) =>
    [
      "group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
      flex1 ? "flex-1" : "",
      onDark
        ? "border border-white/20 bg-zinc-950/45 text-white hover:border-amber-300/45 hover:bg-zinc-900/70"
        : "border border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50",
    ].join(" ");
  const iconClass = onDark
    ? "h-4 w-4 text-amber-100"
    : "h-4 w-4 text-amber-900";
  const iconWrapClass = onDark
    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 ring-1 ring-amber-300/30"
    : "inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200";

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (!f) return;
    const err = validateImageFile(f);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    onFiles([f]);
  };

  const onVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (!f) return;
    const err = validateVideoFile(f);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    onFiles([f]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => photoInputRef.current?.click()}
          className={btnClass(true)}
        >
          <span className={iconWrapClass} aria-hidden>
            <CameraIcon className={iconClass} />
          </span>
          <span>Take A Photo</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => videoInputRef.current?.click()}
          className={btnClass(true)}
        >
          <span className={iconWrapClass} aria-hidden>
            <VideoCameraIcon className={iconClass} />
          </span>
          <span>Take A Video</span>
        </button>
      </div>
      <input
        ref={photoInputRef}
        id={photoInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        disabled={disabled}
        onChange={onPhotoChange}
        aria-hidden
      />
      <input
        ref={videoInputRef}
        id={videoInputId}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        disabled={disabled}
        onChange={onVideoChange}
        aria-hidden
      />
      {fileError && (
        <p
          role="alert"
          className={
            onDark
              ? "rounded-xl bg-amber-950/40 px-3 py-2 text-center text-xs text-amber-100 ring-1 ring-amber-500/20"
              : "rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-950"
          }
        >
          {fileError}
        </p>
      )}
    </div>
  );
}
