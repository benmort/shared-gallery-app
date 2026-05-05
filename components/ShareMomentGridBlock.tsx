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

type UploadSession = {
  uploadId: string;
  pathname: string;
};

type ReconcileResponse = {
  photos?: Photo[];
  pendingUploadIds?: string[];
};

export default function ShareMomentGridBlock({ onUploadSuccess, backHref }: Props) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clientBlobUpload, setClientBlobUpload] = useState(false);
  const [batchUploadedCount, setBatchUploadedCount] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [liveMessage, setLiveMessage] = useState("");
  const [lastResult, setLastResult] = useState<{
    uploaded: number;
    failed: number;
  } | null>(null);

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
        uploadId: newPreviewId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        progress: 0,
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

  const updateItem = useCallback((id: string, patch: Partial<PreviewItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const revokeAll = useCallback((list: PreviewItem[]) => {
    list.forEach((i) => URL.revokeObjectURL(i.previewUrl));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => {
      const toRevoke = prev.filter((item) => item.status === "done");
      revokeAll(toRevoke);
      return prev.filter((item) => item.status !== "done");
    });
    setSuccess(false);
  }, [revokeAll]);

  const retryItem = useCallback((id: string) => {
    updateItem(id, { status: "queued", progress: 0, error: undefined });
  }, [updateItem]);

  const initUploadSession = useCallback(async (item: PreviewItem): Promise<UploadSession> => {
    const mime = item.file.type || "application/octet-stream";
    const fallbackPathname = `album-img/${item.uploadId}.${extensionForMime(mime)}`;
    try {
      const res = await fetch("/api/photos/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: item.uploadId,
          filename: item.file.name,
          mime,
          size: item.file.size,
        }),
      });
      if (!res.ok) return { uploadId: item.uploadId, pathname: fallbackPathname };
      const data = (await res.json()) as UploadSession;
      if (!data.pathname || !data.uploadId) {
        return { uploadId: item.uploadId, pathname: fallbackPathname };
      }
      return data;
    } catch {
      return { uploadId: item.uploadId, pathname: fallbackPathname };
    }
  }, []);

  const reconcileUpload = useCallback(async (uploadId: string): Promise<Photo | null> => {
    for (let attempt = 0; attempt < 7; attempt++) {
      try {
        const res = await fetch("/api/photos/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadIds: [uploadId] }),
        });
        if (!res.ok) break;
        const data = (await res.json()) as ReconcileResponse;
        const first = data.photos?.[0];
        if (first) return first;
        if (!data.pendingUploadIds?.includes(uploadId)) return null;
      } catch {
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
    return null;
  }, []);

  const upload = async () => {
    if (!items.length || uploading) return;
    const queue = items.filter((item) => item.status === "queued" || item.status === "failed");
    if (!queue.length) return;
    setUploading(true);
    setBatchTotal(queue.length);
    setBatchUploadedCount(0);
    setLastResult(null);
    setUploadProgress(0);
    setErrors([]);
    setSuccess(false);
    setLiveMessage(`Starting upload for ${queue.length} item${queue.length === 1 ? "" : "s"}.`);
    const uploadedPhotos: Photo[] = [];
    const totalBytes = Math.max(
      1,
      queue.reduce((sum, item) => sum + item.file.size, 0),
    );
    let doneBytes = 0;
    let uploadedCount = 0;
    let failedCount = 0;
    try {
      for (const item of queue) {
        const file = item.file;
        const mime = file.type || "application/octet-stream";
        const fileBase = doneBytes;
        updateItem(item.id, {
          status: "uploading",
          progress: 0,
          error: undefined,
        });
        setLiveMessage(`Uploading ${file.name}.`);
        if (clientBlobUpload) {
          const session = await initUploadSession(item);
          updateItem(item.id, { uploadId: session.uploadId });
          try {
            await uploadToBlob(session.pathname, file, {
              access: "private",
              handleUploadUrl: "/api/blob/upload",
              multipart: file.size > 4_500_000,
              clientPayload: JSON.stringify({
                uploadId: session.uploadId,
                filename: file.name,
                mime,
                size: file.size,
              }),
              onUploadProgress: (p: {
                loaded: number;
                total: number;
                percentage: number;
              }) => {
                updateItem(item.id, {
                  status: "uploading",
                  progress: Math.max(0, Math.min(1, p.percentage / 100)),
                });
                setUploadProgress((fileBase + p.loaded) / totalBytes);
              },
            });
            updateItem(item.id, { status: "processing", progress: 1 });
            setLiveMessage(`Processing ${file.name}.`);
            const reconciled = await reconcileUpload(session.uploadId);
            updateItem(item.id, { status: "done", progress: 1 });
            if (reconciled) uploadedPhotos.push(reconciled);
            uploadedCount += 1;
            setBatchUploadedCount(uploadedCount);
            setLiveMessage(`Uploaded ${file.name}.`);
          } catch {
            updateItem(item.id, {
              status: "failed",
              error: "Upload failed.",
              progress: 0,
            });
            failedCount += 1;
            setLiveMessage(`Upload failed for ${file.name}.`);
          }
        } else {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("uploadId", item.uploadId);
            updateItem(item.id, { status: "uploading", progress: 0 });
            const res = await postFormDataWithProgress("/api/photos", fd, (ratio) => {
              updateItem(item.id, { status: "uploading", progress: ratio });
              setUploadProgress((fileBase + ratio * file.size) / totalBytes);
            });
            const data = (await res.json()) as { error?: string; photos?: Photo[] };
            if (!res.ok) {
              updateItem(item.id, {
                status: "failed",
                error: data.error || "Upload failed",
                progress: 0,
              });
              failedCount += 1;
              setLiveMessage(`Upload failed for ${file.name}.`);
            } else {
              updateItem(item.id, { status: "done", progress: 1 });
              const photo = data.photos?.[0];
              if (photo) uploadedPhotos.push(photo);
              uploadedCount += 1;
              setBatchUploadedCount(uploadedCount);
              setLiveMessage(`Uploaded ${file.name}.`);
            }
          } catch {
            updateItem(item.id, {
              status: "failed",
              error: "Upload failed.",
              progress: 0,
            });
            failedCount += 1;
            setLiveMessage(`Upload failed for ${file.name}.`);
          }
        }
        doneBytes += file.size;
        setUploadProgress(doneBytes / totalBytes);
      }
      if (uploadedPhotos.length) {
        onUploadSuccess?.(uploadedPhotos);
      }
      if (clientBlobUpload && uploadedPhotos.length < uploadedCount) {
        onUploadSuccess?.();
      }
      if (uploadedCount > 0) {
        setSuccess(true);
      }
      if (failedCount > 0) {
        setErrors((prev) => [
          ...prev,
          `${failedCount} item${failedCount === 1 ? "" : "s"} failed to upload. Retry from the queue.`,
        ]);
      }
      setLastResult({ uploaded: uploadedCount, failed: failedCount });
    } catch {
      setErrors(["Something went wrong. Check your connection and try again."]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div id="share-moment-lead" className="relative mb-3 break-inside-avoid sm:mb-5">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-left text-white shadow-2xl sm:p-5"
      >
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex min-h-8 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
            BACK TO APP
          </Link>
        ) : null}
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Add photos and videos to the shared album from your library or straight from your phone.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {items.length > 0 ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-stone-200">
              {items.length} selected
            </span>
          ) : null}
          {uploading ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-100">
              {batchUploadedCount}/{batchTotal} uploaded
            </span>
          ) : null}
          {lastResult ? (
            <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-100">
              {lastResult.uploaded} success / {lastResult.failed} failed
            </span>
          ) : null}
        </div>
        {(uploading || batchTotal > 0) && (
          <div
            className="mt-3 rounded-xl border border-white/15 bg-black/30 p-2.5"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(uploadProgress * 100)}
            aria-label="Upload progress"
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-amber-400 transition-[width] duration-150 ease-out"
                style={{ width: `${Math.max(2, uploadProgress * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-stone-300">
              <span className="inline-flex items-center gap-1">
                {uploading ? (
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                {uploading ? "Uploading queue" : "Upload batch complete"}
              </span>
              <span>{Math.round(uploadProgress * 100)}%</span>
            </div>
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {liveMessage}
        </p>

        <section className="mt-4 flex flex-col gap-4 text-left" aria-label="Upload">
          <div className="md:hidden">
            <CameraCapture onFiles={addFiles} disabled={uploading} onDark />
          </div>
          <UploadDropzone onFiles={addFiles} disabled={uploading} variant="onDark" />
          {items.length > 0 ? (
            <UploadPreviewList
              items={items}
              onRemove={removeItem}
              onRetry={retryItem}
              disabled={uploading}
              showRemove={!uploading}
            />
          ) : null}

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
          {!uploading && items.some((item) => item.status === "done") ? (
            <button
              type="button"
              onClick={clearCompleted}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-100 transition hover:bg-white/10"
            >
              Clear completed
            </button>
          ) : null}

          {items.length > 0 ? (
            <div className="mt-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void upload()}
                aria-busy={uploading}
                className={`pointer-events-auto z-10 min-h-12 w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-black transition inline-flex items-center justify-center gap-2 ${
                  uploading ? "cursor-not-allowed opacity-100" : "hover:bg-white/90"
                }`}
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
            </div>
          ) : null}

          <UploadTermsNotice variant="onDark" />
        </section>
      </div>
    </div>
  );
}
