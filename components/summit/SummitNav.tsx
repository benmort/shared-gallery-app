"use client";

import {
  CalendarDaysIcon,
  HomeIcon,
  PhotoIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const bottomTabs: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/schedule", label: "Schedule", icon: CalendarDaysIcon },
  { href: "/speakers", label: "Speakers", icon: UserGroupIcon },
  { href: "/moments", label: "Moments", icon: PhotoIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SummitNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-100"
          >
            Common Threads Summit &#39;26
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/schedule"
              className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-200 hover:bg-white/10"
            >
              View schedule
            </Link>
          </div>
        </div>
      </header>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(0.65rem+var(--album-safe-bottom))]">
        <nav className="pointer-events-auto flex w-full max-w-[440px] items-center gap-1 rounded-2xl border border-white/15 bg-zinc-950/95 px-2 py-2 shadow-2xl backdrop-blur">
          {bottomTabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl bg-amber-500/15 px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200"
                    : "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] uppercase tracking-[0.1em] text-stone-400 hover:bg-white/10 hover:text-stone-200"
                }
              >
                <Icon className="h-4 w-4" />
                <span className="w-full text-center leading-tight break-words">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
