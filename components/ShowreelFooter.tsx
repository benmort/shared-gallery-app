"use client";

import Image from "next/image";

/** Logo-only footer for `?showreel=true` (no upload UI). */
export default function ShowreelFooter() {
  return (
    <footer
      className="relative w-full border-t border-white/10 bg-black/90 px-3 py-4 pb-[max(1rem,var(--album-safe-bottom))] backdrop-blur-md sm:px-5"
      aria-label="Common Threads"
    >
      <div className="mx-auto flex w-full justify-center">
        <Image
          src="/Common-Threads-Logo.png"
          alt="Common Threads"
          width={520}
          height={200}
          priority
          className="h-9 w-auto max-w-[min(85vw,220px)] object-contain opacity-90 sm:h-10"
        />
      </div>
    </footer>
  );
}
