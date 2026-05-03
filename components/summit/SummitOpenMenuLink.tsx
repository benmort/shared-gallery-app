"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { SUMMIT_OPEN_MENU_EVENT } from "@/lib/summit/menu-events";

export default function SummitOpenMenuLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SUMMIT_OPEN_MENU_EVENT))}
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-amber-300"
    >
      View full menu
      <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
