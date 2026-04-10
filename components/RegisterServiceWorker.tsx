"use client";

import { useEffect } from "react";

/**
 * Registers the minimal PWA service worker in production only.
 * See [public/sw.js](public/sw.js).
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures */
    });
  }, []);

  return null;
}
