"use client";

import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { upload as uploadToBlob } from "@vercel/blob/client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { validateMediaFile } from "@/lib/client-validate";
import type { Photo } from "@/lib/types/photo";
import { extensionForMime } from "@/lib/types/photo";
import { postFormDataWithProgress } from "@/utils/postFormDataWithProgress";
import CameraCapture from "./CameraCapture";
import EmptyState from "./EmptyState";
import UploadDropzone from "./UploadDropzone";
import UploadPreviewList, { type PreviewItem } from "./UploadPreviewList";
import UploadTermsNotice from "./UploadTermsNotice";

function newPreviewId() {
  return crypto.randomUUID();
}

type Props = {
  onUploadSuccess?: (photos?: Photo[]) => void;
  backHref?: string;
};

export default function ShareMomentGridBlock({ onUploadSuccess, backHref }: Props) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientBlobUpload, setClientBlobUpload] = useState(false);

  useEffect(() => {
    void fetch("/api/photos/capabilities")
      .then((r) => r.json())
      .then((d: { clientUpload?: boolean }) => setClientBlobUpload(!!d.clientUpload))
      .catch(() => setClientBlobUpload(false));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setErrors([]);
    setSuccess(false);
    const errs: string[] = [];
    const next: PreviewItem[] = [];
    for (const file of files) {
      const msg = validateMediaFile(file);
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
    if (next.length) {
      setItems((prev) => [...prev, ...next]);
    }
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
    setUploadProgress(0);
    setErrors([]);
    setSuccess(false);
    const snapshot = items;
    try {
      if (clientBlobUpload) {
        const mime = (f: File) => f.type || "application/octet-stream";
        let doneBytes = 0;
        const totalBytes = Math.max(
          1,
          snapshot.reduce((s, i) => s + i.file.size, 0),
        );
        for (const item of snapshot) {
          const file = item.file;
          const m = mime(file);
          const id = crypto.randomUUID();
          const ext = extensionForMime(m);
          const pathname = `album-img/${id}.${ext}`;
          await uploadToBlob(pathname, file, {
            access: "private",
            handleUploadUrl: "/api/blob/upload",
            multipart: file.size > 4_500_000,
            clientPayload: JSON.stringify({
              filename: file.name,
              mime: m,
            }),
            onUploadProgress: (p: {
              loaded: number;
              total: number;
              percentage: number;
            }) => {
              setUploadProgress((doneBytes + p.loaded) / totalBytes);
            },
          });
          doneBytes += file.size;
          setUploadProgress(doneBytes / totalBytes);
        }
        setSuccess(true);
        setItems([]);
        revokeAll(snapshot);
        onUploadSuccess?.();
        return;
      }

      const fd = new FormData();
      snapshot.forEach((i) => fd.append("file", i.file));
      const res = await postFormDataWithProgress("/api/photos", fd, (r) =>
        setUploadProgress(r),
      );
      const data = (await res.json()) as {
        error?: string;
        photos?: Photo[];
      };
      if (!res.ok) {
        setErrors([data.error || "Upload failed"]);
        return;
      }
      setSuccess(true);
      setItems([]);
      revokeAll(snapshot);
      onUploadSuccess?.(data.photos);
    } catch {
      setErrors(["Something went wrong. Check your connection and try again."]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div id="share-moment-lead" className="relative mb-3 break-inside-avoid sm:mb-5">
      {uploading && (
        <div
          className="fixed inset-0 z-[200] hidden max-[639px]:flex flex-col bg-black/85 backdrop-blur-sm"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(uploadProgress * 100)}
          aria-label="Upload progress"
        >
          <div className="h-1 w-full bg-white/15">
            <div
              className="h-full bg-amber-400 transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(2, uploadProgress * 100)}%` }}
            />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
            <ArrowPathIcon
              className="h-10 w-10 shrink-0 animate-spin text-white/90"
              aria-hidden
            />
            <p className="text-center text-sm font-medium text-white/95">
              Uploading…
            </p>
          </div>
        </div>
      )}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-left text-white shadow-2xl sm:p-5"
        aria-label="Share A Moment"
      >
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex min-h-8 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
            Back to app
          </Link>
        ) : null}
        <h2 className="mt-1 text-2xl font-semibold leading-tight text-white">Share A Moment</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Add photos and videos to the shared album from your library or straight from your phone.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {items.length > 0 ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-stone-200">
              {items.length} selected
            </span>
          ) : null}
        </div>

        <section className="mt-4 flex flex-col gap-4 text-left" aria-label="Upload">
          <div className="md:hidden">
            <CameraCapture onFiles={addFiles} disabled={uploading} onDark />
          </div>
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
              Added to the album.
            </p>
          )}

          <button
            type="button"
            disabled={uploading || items.length === 0}
            onClick={() => void upload()}
            aria-busy={uploading}
            className={`pointer-events-auto z-10 mt-2 min-h-12 w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed ${
              uploading ? "opacity-100" : "disabled:opacity-40"
            } inline-flex items-center justify-center gap-2`}
          >
            {uploading && (
              <ArrowPathIcon
                className="h-4 w-4 shrink-0 animate-spin"
                aria-hidden
              />
            )}
            {uploading
              ? "Uploading..."
              : `Upload${items.length ? ` (${items.length})` : ""}`}
          </button>

          <UploadTermsNotice variant="onDark" />
        </section>
      </div>
    </div>
  );
}
