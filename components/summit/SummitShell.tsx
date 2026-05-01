"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SummitNav from "@/components/summit/SummitNav";
import {
  ACKNOWLEDGEMENT_ACCEPTED_EVENT,
  ACKNOWLEDGEMENT_COOKIE_NAME,
} from "@/lib/summit/acknowledgement";

type Props = {
  children: React.ReactNode;
};

function hasAcknowledgedCountry(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part.startsWith(`${ACKNOWLEDGEMENT_COOKIE_NAME}=`));
}

export default function SummitShell({ children }: Props) {
  const pathname = usePathname();
  const [showNav, setShowNav] = useState(pathname !== "/");

  useEffect(() => {
    if (pathname !== "/") {
      setShowNav(true);
      return;
    }

    setShowNav(hasAcknowledgedCountry());

    const showDashboardNav = () => {
      setShowNav(true);
    };

    window.addEventListener(ACKNOWLEDGEMENT_ACCEPTED_EVENT, showDashboardNav);
    return () => {
      window.removeEventListener(ACKNOWLEDGEMENT_ACCEPTED_EVENT, showDashboardNav);
    };
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-zinc-950 text-stone-100">
      {showNav ? <SummitNav /> : null}
      <main
        className={`mx-auto w-full min-w-0 max-w-[1100px] break-words px-4 pt-5 sm:px-6 sm:pt-6 ${
          showNav ? "pb-[calc(6.75rem+var(--album-safe-bottom))]" : "pb-6"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
