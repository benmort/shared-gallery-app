"use client";

import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { upload as uploadToBlob } from "@vercel/blob/client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { validateMediaFile } from "@/lib/client-validate";
import type { Photo } from "@/lib/types/photo";
import { extensionForMime } from "@/lib/types/photo";
import {
  uploadParallelism,
  uploadRetryBaseDelayMs,
  uploadRetryCount,
  uploadSessionPollMs,
  uploadSessionTimeoutMs,
} from "@/lib/upload-config";
import { classifyUploadError, safeErrorMessage } from "@/lib/upload-errors";
import { aggregateUploadProgress, nextRetryDelay } from "@/lib/upload-progress";
import { postFormDataWithProgress } from "@/utils/postFormDataWithProgress";
import CameraCapture from "./CameraCapture";
import UploadDropzone from "./UploadDropzone";
import UploadPreviewList, { type PreviewItem, type PreviewStatus } from "./UploadPreviewList";
import UploadTermsNotice from "./UploadTermsNotice";

function newPreviewId() {
  return crypto.randomUUID();
}

function logClientUploadEvent(event: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      domain: "moments-upload-client",
      event,
      ...payload,
    }),
  );
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
  const [uploadV2, setUploadV2] = useState(false);
  const [parallelism, setParallelism] = useState(uploadParallelism());
  const [liveRegionMessage, setLiveRegionMessage] = useState("");

  useEffect(() => {
    void fetch("/api/photos/capabilities")
      .then((r) => r.json())
      .then((d: { clientUpload?: boolean; uploadV2?: boolean; parallelism?: number }) => {
        setClientBlobUpload(!!d.clientUpload);
        setUploadV2(!!d.uploadV2);
        if (typeof d.parallelism === "number" && d.parallelism > 0) {
          setParallelism(Math.max(1, Math.min(6, Math.round(d.parallelism))));
        }
      })
      .catch(() => {
        setClientBlobUpload(false);
        setUploadV2(false);
      });
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
        status: "queued",
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
      if (!t || t.status === "uploading") return prev;
      if (t) URL.revokeObjectURL(t.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const revokeAll = useCallback((list: PreviewItem[]) => {
    list.forEach((i) => URL.revokeObjectURL(i.previewUrl));
  }, []);

  const setItemStatus = useCallback((id: string, status: PreviewStatus, error?: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              error: error || undefined,
            }
          : item,
      ),
    );
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const retryableUpload = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    let attempts = 0;
    const maxAttempts = uploadRetryCount();
    let lastError: unknown;
    while (attempts <= maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const cls = classifyUploadError(error);
        if (cls === "terminal" || attempts === maxAttempts) {
          throw error;
        }
        const delay = nextRetryDelay(uploadRetryBaseDelayMs(), attempts);
        await sleep(delay);
      }
      attempts += 1;
    }
    throw lastError instanceof Error ? lastError : new Error("Upload failed");
  }, []);

  const fetchUploadedByIds = useCallback(async (ids: string[]): Promise<Photo[]> => {
    if (!ids.length) return [];
    const res = await fetch(`/api/photos?ids=${encodeURIComponent(ids.join(","))}`);
    if (!res.ok) return [];
    return ((await res.json()) as Photo[]) || [];
  }, []);

  const uploadWithBlobV2 = useCallback(
    async (snapshot: PreviewItem[]) => {
      const candidates = snapshot.filter((item) => item.status !== "uploaded");
      if (!candidates.length) return;
      const descriptors = candidates.map((item) => {
        const mime = item.file.type || "application/octet-stream";
        const ext = extensionForMime(mime);
        const blobId = crypto.randomUUID();
        return {
          item,
          mime,
          pathname: `album-img/${blobId}.${ext}`,
          size: item.file.size,
        };
      });
      const sessionRes = await fetch("/api/photos/upload-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: descriptors.map((d) => ({
            fileClientId: d.item.id,
            pathname: d.pathname,
            filename: d.item.file.name,
            mime: d.mime,
            size: d.size,
          })),
        }),
      });
      if (!sessionRes.ok) {
        const body = (await sessionRes.json()) as { error?: string };
        throw new Error(body.error || "Failed to start upload session");
      }
      const sessionData = (await sessionRes.json()) as { sessionId: string };
      const sessionId = sessionData.sessionId;
      logClientUploadEvent("upload.session-created", {
        sessionId,
        files: descriptors.length,
      });
      const totalBytes = Math.max(
        1,
        descriptors.reduce((sum, d) => sum + d.item.file.size, 0),
      );
      const loadedById = new Map<string, number>();
      const errorList: string[] = [];

      const reportProgress = () => {
        setUploadProgress(aggregateUploadProgress(totalBytes, [...loadedById.values()]));
      };

      let cursor = 0;
      const workerCount = Math.min(parallelism, descriptors.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
          const idx = cursor++;
          const descriptor = descriptors[idx];
          if (!descriptor) return;
          const { item, mime, pathname, size } = descriptor;
          setItemStatus(item.id, "uploading");
          loadedById.set(item.id, 0);
          reportProgress();
          try {
            await retryableUpload(async () => {
              await uploadToBlob(pathname, item.file, {
                access: "private",
                handleUploadUrl: "/api/blob/upload",
                multipart: item.file.size > 4_500_000,
                clientPayload: JSON.stringify({
                  filename: item.file.name,
                  mime,
                  pathname,
                  sessionId,
                  fileClientId: item.id,
                  expectedCount: descriptors.length,
                  size,
                }),
                onUploadProgress: (p: {
                  loaded: number;
                  total: number;
                  percentage: number;
                }) => {
                  loadedById.set(item.id, Math.min(size, p.loaded));
                  reportProgress();
                },
              });
            });
            loadedById.set(item.id, size);
            setItemStatus(item.id, "uploaded");
            logClientUploadEvent("upload.file-uploaded", {
              sessionId,
              fileClientId: item.id,
              filename: item.file.name,
            });
            reportProgress();
          } catch (error) {
            const message = safeErrorMessage(error, "Upload failed");
            setItemStatus(item.id, "failed", message);
            errorList.push(`${item.file.name}: ${message}`);
            logClientUploadEvent("upload.file-failed", {
              sessionId,
              fileClientId: item.id,
              filename: item.file.name,
              error: message,
              class: classifyUploadError(error),
            });
          }
        }
      });

      await Promise.all(workers);

      const pollStart = Date.now();
      let finalPhotoIds: string[] = [];
      const finalErrors: string[] = [...errorList];
      while (Date.now() - pollStart < uploadSessionTimeoutMs()) {
        const statusRes = await fetch(`/api/photos/upload-sessions/${encodeURIComponent(sessionId)}`);
        if (!statusRes.ok) {
          await sleep(uploadSessionPollMs());
          continue;
        }
        const statusData = (await statusRes.json()) as {
          complete?: boolean;
          uploadedPhotoIds?: string[];
          files?: Record<string, { status: PreviewStatus | "registered"; error?: string }>;
        };
        if (statusData.files) {
          for (const [id, value] of Object.entries(statusData.files)) {
            if (value.status === "registered" || value.status === "uploaded") {
              setItemStatus(id, "uploaded");
            } else if (value.status === "failed") {
              setItemStatus(id, "failed", value.error);
              if (value.error) finalErrors.push(value.error);
            }
          }
        }
        if (Array.isArray(statusData.uploadedPhotoIds)) {
          finalPhotoIds = statusData.uploadedPhotoIds;
        }
        if (statusData.complete) break;
        await sleep(uploadSessionPollMs());
      }

      const uploadedPhotos = await fetchUploadedByIds(finalPhotoIds);
      if (uploadedPhotos.length) {
        onUploadSuccess?.(uploadedPhotos);
      } else {
        onUploadSuccess?.();
      }

      if (finalErrors.length) {
        setErrors((prev) => [...prev, ...finalErrors]);
      } else {
        setSuccess(true);
      }
      logClientUploadEvent("upload.session-finished", {
        sessionId,
        uploaded: finalPhotoIds.length,
        errors: finalErrors.length,
      });
    },
    [
      fetchUploadedByIds,
      onUploadSuccess,
      parallelism,
      retryableUpload,
      setItemStatus,
    ],
  );

  const upload = async () => {
    const queued = items.filter((i) => i.status !== "uploaded");
    if (!queued.length || uploading) return;
    setUploading(true);
    setUploadProgress(0);
    setErrors([]);
    setSuccess(false);
    setLiveRegionMessage("Upload started");
    const snapshot = items.map((item) => ({ ...item }));
    try {
      if (clientBlobUpload && uploadV2) {
        await uploadWithBlobV2(snapshot);
        setItems((prev) => {
          const keep = prev.filter((item) => item.status !== "uploaded");
          const done = prev.filter((item) => item.status === "uploaded");
          revokeAll(done);
          return keep;
        });
        setLiveRegionMessage("Upload complete");
        return;
      }

      const fd = new FormData();
      snapshot
        .filter((item) => item.status !== "uploaded")
        .forEach((item) => {
          setItemStatus(item.id, "uploading");
          fd.append("file", item.file);
        });
      const res = await postFormDataWithProgress("/api/photos", fd, (r) =>
        setUploadProgress(r),
      );
      const data = (await res.json()) as {
        error?: string;
        photos?: Photo[];
      };
      if (!res.ok) {
        const msg = data.error || "Upload failed";
        setErrors([msg]);
        snapshot
          .filter((item) => item.status !== "uploaded")
          .forEach((item) => setItemStatus(item.id, "failed", msg));
        return;
      }
      setSuccess(true);
      snapshot
        .filter((item) => item.status !== "uploaded")
        .forEach((item) => setItemStatus(item.id, "uploaded"));
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
          className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-sm"
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
            <p className="text-center text-xs text-white/75">{Math.round(uploadProgress * 100)}%</p>
          </div>
        </div>
      )}
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
        <p className="mt-1 text-xs text-stone-400">Video max: 250 MB</p>

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
          {items.length > 0 ? (
            <UploadPreviewList
              items={items}
              onRemove={removeItem}
              disabled={uploading}
            />
          ) : null}
          <p className="sr-only" aria-live="polite">
            {liveRegionMessage}
          </p>

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
