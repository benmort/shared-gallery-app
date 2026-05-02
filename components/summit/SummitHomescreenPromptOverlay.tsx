"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HOMESCREEN_PROMPT_ANDROID_BODY,
  HOMESCREEN_PROMPT_BODY,
  HOMESCREEN_PROMPT_FALLBACK_BODY,
  HOMESCREEN_PROMPT_IOS_STEPS,
  HOMESCREEN_PROMPT_TITLE,
} from "@/lib/summit/acknowledgement";

type Props = {
  open: boolean;
  onComplete: () => void;
};

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PromptMode = "android" | "ios" | "fallback";

const HOMESCREEN_PROMPT_FADE_DURATION_MS = 300;

function isIosSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isCriOS = /CriOS/.test(userAgent);
  const isFxiOS = /FxiOS/.test(userAgent);

  return isIos && isWebKit && !isCriOS && !isFxiOS;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return navigatorStandalone || mediaStandalone;
}

export default function SummitHomescreenPromptOverlay({ open, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const isIosSafari = useMemo(() => isIosSafariBrowser(), []);
  const isStandalone = useMemo(() => isStandaloneMode(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    return () => {
      if (completeTimerRef.current !== null) {
        window.clearTimeout(completeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      setIsCompleting(false);
      return;
    }

    if (isStandalone) {
      onComplete();
      return;
    }

    setIsCompleting(false);
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isStandalone, onComplete, open]);

  const promptMode: PromptMode = isIosSafari ? "ios" : deferredPrompt ? "android" : "fallback";

  const completePrompt = () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setVisible(false);
    completeTimerRef.current = window.setTimeout(() => {
      onComplete();
    }, HOMESCREEN_PROMPT_FADE_DURATION_MS);
  };

  const handlePrimaryAction = async () => {
    if (promptMode !== "android" || !deferredPrompt) {
      completePrompt();
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // Ignore prompt failures and let users continue.
    } finally {
      setDeferredPrompt(null);
      completePrompt();
    }
  };

  if (!open || isStandalone) return null;

  return (
    <div
      className={`fixed inset-0 z-[255] flex min-h-dvh items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border border-white/15 bg-zinc-950/95 p-6 shadow-2xl transition duration-300 ease-out sm:p-8 ${
          visible ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"
        }`}
      >
        <h2 className="text-balance text-center text-base font-semibold uppercase tracking-[0.16em] text-amber-200 sm:text-lg">
          {HOMESCREEN_PROMPT_TITLE}
        </h2>
        <div className="mt-5 space-y-4 text-base font-bold leading-relaxed text-stone-200 sm:text-lg">
          <p>{HOMESCREEN_PROMPT_BODY}</p>
          {promptMode === "android" ? <p>{HOMESCREEN_PROMPT_ANDROID_BODY}</p> : null}
          {promptMode === "fallback" ? <p>{HOMESCREEN_PROMPT_FALLBACK_BODY}</p> : null}
          {promptMode === "ios" ? (
            <ol className="list-decimal space-y-2 pl-6">
              {HOMESCREEN_PROMPT_IOS_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handlePrimaryAction()}
          disabled={isCompleting}
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:opacity-80"
        >
          {promptMode === "android" ? "Install and continue" : "Continue"}
          <ChevronRightIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
