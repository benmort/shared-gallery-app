"use client";

import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useCallback, useId, useRef, useState } from "react";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  variant?: "default" | "onDark";
};

export default function UploadDropzone({
  onFiles,
  disabled,
  variant = "default",
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      onFiles(Array.from(list));
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFiles],
  );

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
          variant === "onDark"
            ? dragOver
              ? "border-amber-400/80 bg-amber-500/10"
              : "border-white/25 bg-white/5 hover:border-white/40 hover:bg-white/10"
            : dragOver
              ? "border-amber-400 bg-amber-50/80"
              : "border-stone-200 bg-white/60 hover:border-stone-300 hover:bg-white",
          disabled ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        <span
          className={`inline-flex items-center gap-2 text-sm font-medium ${
            variant === "onDark" ? "text-white" : "text-stone-800"
          }`}
        >
          <ArrowUpTrayIcon className="h-4 w-4" aria-hidden />
          <span>Tap to choose from your library</span>
        </span>
        <span
          className={
            variant === "onDark" ? "text-xs text-stone-400" : "text-xs text-stone-500"
          }
        >
          Images or Videos — multiple files ok
        </span>
      </label>
    </div>
  );
}
