"use client";

import Image from "next/image";

/** Logo-only footer for `/moments/showreel` (no upload UI). */
export default function ShowreelFooter() {
  return (
    <footer
      className="relative w-full bg-black/90 px-3 py-4 pb-[max(1rem,var(--album-safe-bottom))] backdrop-blur-md sm:px-5"
      aria-label="Common Threads"
    >
      <div className="mx-auto flex w-full justify-center">
        <Image
          src="/Common-Threads-Logo.png"
          alt="Common Threads"
          width={520}
          height={200}
          priority
          className="h-[6.75rem] w-auto max-w-[min(85vw,660px)] object-contain opacity-90 sm:h-[7.5rem]"
        />
      </div>
    </footer>
  );
}
