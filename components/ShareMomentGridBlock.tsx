"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { validateImageFile } from "@/lib/client-validate";
import CameraCapture from "./CameraCapture";
import EmptyState from "./EmptyState";
import UploadDropzone from "./UploadDropzone";
import UploadPreviewList, { type PreviewItem } from "./UploadPreviewList";

function newPreviewId() {
  return crypto.randomUUID();
}

type Props = {
  onUploadSuccess?: () => void;
};

export default function ShareMomentGridBlock({ onUploadSuccess }: Props) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    setErrors([]);
    setSuccess(false);
    const errs: string[] = [];
    const next: PreviewItem[] = [];
    for (const file of files) {
      const msg = validateImageFile(file);
      if (msg) {
        errs.push(msg);
        continue;
      }
      next.push({
        id: newPreviewId(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (errs.length) setErrors(errs);
    if (next.length) setItems((prev) => [...prev, ...next]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const revokeAll = useCallback((list: PreviewItem[]) => {
    list.forEach((i) => URL.revokeObjectURL(i.previewUrl));
  }, []);

  const upload = async () => {
    if (!items.length || uploading) return;
    setUploading(true);
    setErrors([]);
    setSuccess(false);
    try {
      const fd = new FormData();
      items.forEach((i) => fd.append("file", i.file));
      const res = await fetch("/api/photos", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrors([data.error || "Upload failed"]);
        return;
      }
      setSuccess(true);
      const snapshot = items;
      setItems([]);
      revokeAll(snapshot);
      onUploadSuccess?.();
    } catch {
      setErrors(["Something went wrong. Check your connection and try again."]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative mb-4 break-inside-avoid sm:mb-5">
      <div
        className="after:content relative flex min-h-[min(70vh,629px)] flex-col items-center justify-end gap-4 overflow-hidden rounded-xl bg-white/10 px-4 pb-10 pt-36 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:shadow-highlight sm:pt-48 lg:pt-64"
        aria-label="Share a moment"
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start pt-5 sm:pt-7 lg:pt-9">
          <div className="flex w-full flex-col items-center px-4">
            <Image
              src="/Common-Threads-Logo.png"
              alt="Common Threads"
              width={520}
              height={200}
              priority
              className="relative z-[1] h-auto w-full max-w-[min(85vw,260px)] object-contain sm:max-w-[300px]"
            />
          </div>
          <span
            className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-b from-black/0 via-black to-black"
            aria-hidden
          />
        </div>

        <div className="relative z-10 flex w-full max-w-md flex-col gap-4">
          <h1 className="text-balance text-lg font-bold uppercase tracking-widest text-white sm:text-xl">
            Share a moment
          </h1>
          <p className="text-pretty text-sm leading-relaxed text-white/75">
            Add photos to the shared album — from your library or straight from
            your camera.
          </p>

          <section className="flex flex-col gap-4 text-left" aria-label="Upload">
            <CameraCapture onFiles={addFiles} disabled={uploading} onDark />
            <UploadDropzone onFiles={addFiles} disabled={uploading} variant="onDark" />
            {items.length === 0 ? (
              <EmptyState variant="heroDark" />
            ) : (
              <UploadPreviewList
                items={items}
                onRemove={removeItem}
                disabled={uploading}
              />
            )}

            {errors.length > 0 && (
              <div
                role="alert"
                className="rounded-xl bg-red-950/50 px-3 py-2 text-sm text-red-100 ring-1 ring-red-500/30"
              >
                <ul className="list-inside list-disc space-y-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {success && (
              <p
                role="status"
                className="text-center text-sm font-medium text-emerald-300"
              >
                Photos added to the album.
              </p>
            )}

            <button
              type="button"
              disabled={uploading || items.length === 0}
              onClick={() => void upload()}
              className="pointer-events-auto z-10 mt-2 min-h-12 w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading
                ? "Uploading…"
                : `Upload${items.length ? ` (${items.length})` : ""}`}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
