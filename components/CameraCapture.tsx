"use client";

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
      "min-h-12 rounded-full px-4 text-sm font-semibold shadow-sm transition disabled:opacity-50",
      flex1 ? "flex-1" : "",
      onDark
        ? "border border-white/25 bg-white/10 text-white hover:bg-white/15"
        : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50",
    ].join(" ");

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
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() => photoInputRef.current?.click()}
          className={btnClass(true)}
        >
          Photo capture
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => videoInputRef.current?.click()}
          className={btnClass(true)}
        >
          Video capture
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
