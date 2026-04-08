"use client";

import { useCallback, useId, useRef, useState } from "react";
import { validateImageFile } from "@/lib/client-validate";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Lighter text and controls when placed on a dark hero card */
  onDark?: boolean;
};

type CameraError =
  | "denied"
  | "unavailable"
  | "insecure"
  | "unknown"
  | null;

export default function CameraCapture({
  onFiles,
  disabled,
  onDark,
}: Props) {
  const captureInputId = useId();
  const captureInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"idle" | "live" | "review">("idle");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<CameraError>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const onCaptureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (captureInputRef.current) captureInputRef.current.value = "";
    if (!f) return;
    const err = validateImageFile(f);
    if (err) {
      setError("unknown");
      return;
    }
    onFiles([f]);
  };

  const startLiveCamera = async () => {
    setError(null);
    if (typeof window === "undefined") return;
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setError("insecure");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      captureInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("live");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (e) {
      stopStream();
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("denied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("unavailable");
      } else {
        setError("unknown");
      }
    }
  };

  const snapPhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        setMode("review");
      },
      "image/jpeg",
      0.92,
    );
  };

  const retake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setMode("idle");
    void startLiveCamera();
  };

  const confirmPhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    const err = validateImageFile(file);
    if (err) {
      setError("unknown");
      return;
    }
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setMode("idle");
    onFiles([file]);
  };

  const cancelLive = () => {
    stopStream();
    setMode("idle");
  };

  const errorMessage =
    error === "denied"
      ? "Camera access was blocked. You can still use “Quick photo” below or allow the camera in your browser settings."
      : error === "unavailable"
        ? "No usable camera found. Try “Quick photo” to use your device camera app."
        : error === "insecure"
          ? "Camera needs a secure (HTTPS) connection. Use “Quick photo” instead."
          : error === "unknown"
            ? "Something went wrong with the camera. Try “Quick photo”."
            : null;

  if (mode === "live") {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-stone-900 p-3 text-white">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-[3/4] w-full rounded-xl bg-black object-cover"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={snapPhoto}
            className="min-h-12 flex-1 rounded-full bg-white px-4 text-sm font-semibold text-stone-900"
          >
            Capture
          </button>
          <button
            type="button"
            onClick={cancelLive}
            className="min-h-12 rounded-full bg-white/15 px-4 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === "review" && capturedUrl) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-stone-900 p-3 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={capturedUrl}
          alt="Preview"
          className="max-h-[50vh] w-full rounded-xl object-contain"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={confirmPhoto}
            disabled={disabled}
            className="min-h-12 flex-1 rounded-full bg-amber-200 px-4 text-sm font-semibold text-amber-950 disabled:opacity-50"
          >
            Add to upload
          </button>
          <button
            type="button"
            onClick={retake}
            disabled={disabled}
            className="min-h-12 rounded-full bg-white/15 px-4 text-sm font-medium disabled:opacity-50"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void startLiveCamera()}
          className="min-h-12 flex-1 rounded-full bg-stone-800 px-4 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          Live camera
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => captureInputRef.current?.click()}
          className={
            onDark
              ? "min-h-12 flex-1 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-white/15 disabled:opacity-50"
              : "min-h-12 flex-1 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          }
        >
          Quick photo
        </button>
      </div>
      <input
        ref={captureInputRef}
        id={captureInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={onCaptureInputChange}
      />
      <p
        className={
          onDark
            ? "text-center text-xs text-stone-400"
            : "text-center text-xs text-stone-500"
        }
      >
        Quick photo opens your camera app on most phones. Live camera stays in
        the browser.
      </p>
      {errorMessage && (
        <p
          role="alert"
          className={
            onDark
              ? "rounded-xl bg-amber-950/40 px-3 py-2 text-center text-xs text-amber-100 ring-1 ring-amber-500/20"
              : "rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-950"
          }
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
