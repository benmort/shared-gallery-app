"use client";

import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronRightIcon,
  HomeIcon,
  InformationCircleIcon,
  MapIcon,
  MapPinIcon,
  PhotoIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SUMMIT_OPEN_MENU_EVENT } from "@/lib/summit/menu-events";
import { SUMMIT_MENU_SUBTITLE_BY_HREF } from "@/lib/summit/page-descriptors";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MenuLinkItem = {
  href: string;
  label: string;
  subtitle: string;
};

const bottomTabs: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/program", label: "Program", icon: CalendarDaysIcon },
  { href: "/speakers", label: "Speakers", icon: UserGroupIcon },
  { href: "/moments", label: "Moments", icon: PhotoIcon },
];

const menuLinks: MenuLinkItem[] = [
  { href: "/", label: "Home", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/"] },
  { href: "/program", label: "Program", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/program"] },
  {
    href: "/event-guidance",
    label: "Event Guidance",
    subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/event-guidance"],
  },
  { href: "/speakers", label: "Speakers", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/speakers"] },
  { href: "/crew", label: "Crew", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/crew"] },
  { href: "/moments", label: "Moments", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/moments"] },
  { href: "/venues", label: "Venues", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/venues"] },
  { href: "/events", label: "Events", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/events"] },
  {
    href: "/attractions",
    label: "Attractions",
    subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/attractions"],
  },
  {
    href: "/organisations",
    label: "Organisations",
    subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/organisations"],
  },
  { href: "/sponsors", label: "Sponsors", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/sponsors"] },
  { href: "/surveys", label: "Surveys", subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/surveys"] },
  {
    href: "/code-conduct",
    label: "Code of Conduct",
    subtitle: SUMMIT_MENU_SUBTITLE_BY_HREF["/code-conduct"],
  },
];

function menuIconForHref(href: string): NavItem["icon"] {
  if (href === "/") return HomeIcon;
  if (href === "/program") return CalendarDaysIcon;
  if (href === "/event-guidance") return InformationCircleIcon;
  if (href === "/speakers") return UserGroupIcon;
  if (href === "/crew") return UsersIcon;
  if (href === "/organisations") return BuildingOffice2Icon;
  if (href === "/venues") return MapIcon;
  if (href === "/events") return CalendarDaysIcon;
  if (href === "/attractions") return MapPinIcon;
  if (href === "/sponsors") return BuildingOffice2Icon;
  if (href === "/surveys") return QuestionMarkCircleIcon;
  if (href === "/code-conduct") return InformationCircleIcon;
  if (href === "/moments") return PhotoIcon;
  return ChevronRightIcon;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SummitNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenuTimerRef = useRef<number | null>(null);

  const openMenu = useCallback(() => {
    if (menuOpen) return;
    if (openMenuTimerRef.current !== null) {
      window.clearTimeout(openMenuTimerRef.current);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    openMenuTimerRef.current = window.setTimeout(() => {
      setMenuOpen(true);
      openMenuTimerRef.current = null;
    }, 30);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (openMenuTimerRef.current !== null) {
        window.clearTimeout(openMenuTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const onOpenMenu = () => openMenu();
    window.addEventListener(SUMMIT_OPEN_MENU_EVENT, onOpenMenu);
    return () => window.removeEventListener(SUMMIT_OPEN_MENU_EVENT, onOpenMenu);
  }, [openMenu]);

  const handleMenuToggle = () => {
    if (menuOpen) {
      if (openMenuTimerRef.current !== null) {
        window.clearTimeout(openMenuTimerRef.current);
        openMenuTimerRef.current = null;
      }
      setMenuOpen(false);
      return;
    }
    openMenu();
  };

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;

    if (menuOpen) {
      body.style.overflow = "hidden";
      documentElement.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      documentElement.style.overscrollBehavior = "none";
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-100 lg:text-[13px]"
          >
            Common Threads Summit &#39;26
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMenuToggle}
              aria-expanded={menuOpen}
              className="rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-200 hover:bg-white/10 lg:text-[12px]"
            >
              {menuOpen ? "Close menu" : "View menu"}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-x-0 bottom-0 top-[57px] z-50 transition-opacity duration-300 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
        <aside
          className={`absolute inset-0 overflow-y-auto overscroll-contain bg-zinc-950 transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Summit full menu"
        >
          <div className="mx-auto flex min-h-full w-full max-w-[1100px] flex-col px-4 pb-[calc(1.75rem+var(--album-safe-bottom))] pt-4 sm:px-6">
            <nav className="grid gap-2 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3">
              {menuLinks.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = menuIconForHref(item.href);
                const iconBadgeClass = active
                  ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-300/50 bg-amber-500/20 text-amber-100"
                  : "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/35 bg-black/30 text-amber-100";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex min-h-11 items-center justify-between rounded-md border px-4 py-2.5 transition ${
                      active
                        ? "border-amber-300/40 bg-amber-500/10 font-semibold text-amber-200"
                        : "border-white/35 bg-white/5 text-stone-200 hover:border-white/55 hover:bg-white/10"
                    }`}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className={iconBadgeClass}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm tracking-[0.08em] lg:text-[15.5px]">{item.label}</span>
                        <span
                          className={
                            active
                              ? "mt-0.5 block truncate text-[11px] font-normal leading-4 text-amber-100/90 lg:text-[12.5px]"
                              : "mt-0.5 block truncate text-[11px] leading-4 text-stone-400 lg:text-[12.5px]"
                          }
                        >
                          {item.subtitle}
                        </span>
                      </span>
                    </span>
                    <ChevronRightIcon className="h-4 w-4" aria-hidden />
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>

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
                    ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl bg-amber-500/15 px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200 lg:text-[12px]"
                    : "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] uppercase tracking-[0.1em] text-stone-400 hover:bg-white/10 hover:text-stone-200 lg:text-[12px]"
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
