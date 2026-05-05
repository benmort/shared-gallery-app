"use client";

import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckIcon,
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
import { useCallback, useEffect, useState } from "react";
import { SUMMIT_OPEN_MENU_EVENT } from "@/lib/summit/menu-events";
import { SUMMIT_MENU_SUBTITLE_BY_HREF } from "@/lib/summit/page-descriptors";
import type { SummitRecord } from "@/lib/summit/types";

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

type DrawerPanel = "menu" | "whatsapp";

type WhatsappChannelItem = {
  id: string;
  name: string;
  description: string | null;
  membersLabel: string | null;
  joined: boolean;
  url: string | null;
};

type SummitNavProps = {
  whatsappChannels?: SummitRecord[];
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

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue === "true" || normalizedValue === "yes" || normalizedValue === "1";
  }
  return false;
}

function channelInitials(name: string): string {
  const chunks = name
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (chunks.length === 0) return "?";
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
}

function normalizeWhatsappChannels(records: SummitRecord[]): WhatsappChannelItem[] {
  return records
    .map((record) => {
      const name = normalizeString(record.fields.Name);
      const url = normalizeString(record.fields.Url) ?? normalizeString(record.fields.URL);
      if (!name) return null;
      return {
        id: record.id,
        name,
        description: normalizeString(record.fields.Description),
        membersLabel:
          normalizeString(record.fields.MembersLabel) ??
          normalizeString(record.fields.Members) ??
          normalizeString(record.fields.Audience),
        joined: normalizeBoolean(record.fields.Joined),
        url,
      };
    })
    .filter((record): record is WhatsappChannelItem => !!record);
}

function WhatsappGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M19.03 4.96A10.91 10.91 0 0 0 1.95 18.12L0 24l6.03-1.9a10.96 10.96 0 0 0 5.23 1.33h.01c6.05 0 10.98-4.92 10.99-10.97a10.92 10.92 0 0 0-3.23-7.5Zm-7.76 16.62h-.01a9.1 9.1 0 0 1-4.63-1.26l-.33-.2-3.58 1.13 1.16-3.48-.21-.36a9.08 9.08 0 1 1 7.6 4.17Zm4.98-6.81c-.27-.13-1.58-.78-1.83-.87-.24-.09-.42-.13-.6.14-.18.26-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.13-1.12-.41-2.13-1.31-.79-.7-1.32-1.57-1.47-1.84-.15-.26-.02-.4.11-.53.11-.11.27-.29.4-.44.13-.15.18-.25.27-.42.09-.18.04-.33-.02-.46-.07-.13-.6-1.46-.82-2-.22-.53-.44-.46-.6-.47l-.51-.01c-.18 0-.46.07-.7.33s-.92.9-.92 2.2.95 2.56 1.08 2.73c.13.18 1.86 2.84 4.51 3.99.63.27 1.12.43 1.5.55.63.2 1.2.17 1.65.1.5-.08 1.58-.64 1.8-1.25.22-.62.22-1.14.16-1.25-.07-.1-.25-.17-.52-.3Z" />
    </svg>
  );
}

export default function SummitNav({ whatsappChannels = [] }: SummitNavProps) {
  const pathname = usePathname();
  const [activePanel, setActivePanel] = useState<DrawerPanel | null>(null);
  const normalizedWhatsappChannels = normalizeWhatsappChannels(whatsappChannels);
  const menuOpen = activePanel === "menu";
  const whatsappOpen = activePanel === "whatsapp";
  const panelOpen = activePanel !== null;

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const openPanel = useCallback(
    (panel: DrawerPanel) => {
      if (activePanel === panel) return;
      window.scrollTo({ top: 0, behavior: "auto" });
      setActivePanel(panel);
    },
    [activePanel],
  );

  useEffect(() => {
    closePanel();
  }, [closePanel, pathname]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel, panelOpen]);

  useEffect(() => {
    const onOpenMenu = () => openPanel("menu");
    window.addEventListener(SUMMIT_OPEN_MENU_EVENT, onOpenMenu);
    return () => window.removeEventListener(SUMMIT_OPEN_MENU_EVENT, onOpenMenu);
  }, [openPanel]);

  const handleMenuToggle = () => {
    if (menuOpen) {
      closePanel();
      return;
    }
    openPanel("menu");
  };

  const handleWhatsappToggle = () => {
    if (whatsappOpen) {
      closePanel();
      return;
    }
    openPanel("whatsapp");
  };

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;

    if (panelOpen) {
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
  }, [panelOpen]);

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
              onClick={handleWhatsappToggle}
              aria-expanded={whatsappOpen}
              aria-label={whatsappOpen ? "Close WhatsApp channels" : "Open WhatsApp channels"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-zinc-950 transition hover:bg-amber-400"
            >
              <WhatsappGlyph className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleMenuToggle}
              aria-expanded={menuOpen}
              className="inline-flex h-8 w-[78px] items-center justify-center rounded-full border border-white/20 text-center text-[10px] uppercase tracking-[0.16em] text-stone-200 hover:bg-white/10 lg:text-[12px]"
            >
              {menuOpen ? "CLOSE" : "MENU"}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-x-0 bottom-0 top-[57px] z-50 transition-opacity duration-300 ${
          panelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/60" onClick={closePanel} />
        <aside
          className={`absolute inset-0 overflow-y-auto overscroll-contain bg-zinc-950 transition-transform duration-300 ease-out ${
            panelOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label={menuOpen ? "Summit full menu" : "Summit WhatsApp channels"}
        >
          <div className="mx-auto flex min-h-full w-full max-w-[1100px] flex-col px-4 pb-[calc(1.75rem+var(--album-safe-bottom))] pt-4 sm:px-6">
            {menuOpen ? (
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
                      onClick={closePanel}
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
                          <span className="block truncate text-sm tracking-[0.08em] lg:text-[15.5px]">
                            {item.label}
                          </span>
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
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/65">
                <div className="flex items-center border-b border-white/10 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-amber-100">
                    <WhatsappGlyph className="h-5 w-5" />
                    <span className="text-sm font-semibold uppercase tracking-[0.12em]">
                      WhatsApp Channels
                    </span>
                  </span>
                </div>
                <div className="divide-y divide-white/10">
                  {normalizedWhatsappChannels.length > 0 ? (
                    normalizedWhatsappChannels.map((channel) => {
                      const isLinked = Boolean(channel.url);
                      const rowClass = isLinked
                        ? "group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/5"
                        : "flex items-center justify-between gap-3 px-4 py-3 opacity-90";

                      const rowContent = (
                        <>
                          <span className="inline-flex min-w-0 items-center gap-3">
                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-sm font-semibold uppercase tracking-[0.08em] text-amber-100">
                              {channelInitials(channel.name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold tracking-[0.06em] text-stone-100 lg:text-[15px]">
                                {channel.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] leading-4 text-stone-400 lg:text-[12.5px]">
                                {channel.membersLabel ??
                                  channel.description ??
                                  (isLinked ? "Open channel in WhatsApp" : "Link coming soon")}
                              </span>
                            </span>
                          </span>
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/10 text-amber-100 ${
                              isLinked ? "transition group-hover:bg-amber-500/20" : ""
                            }`}
                          >
                            {channel.joined ? (
                              <CheckIcon className="h-4 w-4" aria-hidden />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" aria-hidden />
                            )}
                          </span>
                        </>
                      );

                      if (!isLinked) {
                        return (
                          <div key={channel.id} className={rowClass}>
                            {rowContent}
                          </div>
                        );
                      }

                      return (
                        <a
                          key={channel.id}
                          href={channel.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          onClick={closePanel}
                          className={rowClass}
                        >
                          {rowContent}
                        </a>
                      );
                    })
                  ) : (
                    <div className="px-4 py-6 text-sm text-stone-300">
                      No WhatsApp channels configured yet.
                    </div>
                  )}
                </div>
              </div>
            )}
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
