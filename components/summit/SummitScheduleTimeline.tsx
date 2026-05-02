"use client";

import {
  ChevronRightIcon,
  MapPinIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ScheduleDay, ScheduleSlot } from "@/lib/summit/schedule";

type Props = {
  days: ScheduleDay[];
};

function dayTabContent(day: ScheduleDay, index: number): {
  dateLine: string;
  titleLine: string;
  venueLine: string | null;
  ariaLabel: string;
} {
  const dayName = day.day?.trim() || `Day ${index + 1}`;
  const dateLine = day.filterDateLabel || day.dateLabel || dayName;
  const titleLine = day.filterTitle || `Day ${index + 1}`;
  const venueLine = day.filterVenue || null;
  const ariaLabel = [dateLine, titleLine, venueLine].filter(Boolean).join(" - ");
  return { dateLine, titleLine, venueLine, ariaLabel };
}

function formatBadge(value: string): string {
  return value.trim().toUpperCase();
}

function ScheduleCard({ slot }: { slot: ScheduleSlot }) {
  const href = slot.talk ? `/speakers/${slot.id}` : `/events/${slot.id}`;
  const speakerLabel = slot.speaker || (slot.talk ? "Session speaker" : "Event session");
  const speakerSubLabel = slot.organisation || slot.locationLabel || slot.room;
  const sessionLabel = slot.formatLabel || (slot.talk ? "Talk" : "Event");
  const cardClass = slot.talk
    ? "rounded-xl border border-white/10 bg-zinc-900/80 p-3.5 sm:p-4"
    : "rounded-xl border border-white/10 bg-zinc-900/45 p-3.5 sm:p-4";

  return (
    <article className={cardClass}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-100">
          {formatBadge(sessionLabel)}
        </span>
        {slot.locationLabel ? (
          <span className="rounded-sm border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-stone-300">
            {formatBadge(slot.locationLabel)}
          </span>
        ) : null}
      </div>

      <h3 className="text-[15px] font-semibold leading-5 text-white">{slot.title}</h3>
      {slot.summary ? <p className="mt-1.5 text-xs leading-5 text-stone-400 break-words">{slot.summary}</p> : null}

      <div className="mt-3 flex items-end justify-between gap-3">
        {slot.talk ? (
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/15 bg-white/5">
                {slot.imageUrl ? (
                  <Image src={slot.imageUrl} alt={speakerLabel} fill className="object-cover" unoptimized />
                ) : (
                  <UserCircleIcon className="h-full w-full p-1 text-stone-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-200 break-words">{speakerLabel}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500 break-words">
                  {speakerSubLabel}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500 break-words">
            {slot.locationLabel || slot.room}
          </p>
        )}
        <Link
          href={href}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium text-amber-200 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
        >
          View details
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export default function SummitScheduleTimeline({ days }: Props) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (activeDayIndex > days.length - 1) setActiveDayIndex(0);
  }, [activeDayIndex, days.length]);

  const activeDay = days[activeDayIndex] ?? days[0];

  function moveFocus(nextIndex: number) {
    setActiveDayIndex(nextIndex);
    requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus());
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Schedule days"
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {days.map((day, index) => {
          const selected = index === activeDayIndex;
          const tabId = `schedule-day-tab-${index}`;
          const panelId = `schedule-day-panel-${index}`;
          const tabContent = dayTabContent(day, index);
          return (
            <button
              key={`${day.day}-${index}`}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={selected}
              aria-label={tabContent.ariaLabel}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveDayIndex(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveFocus((index + 1) % days.length);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveFocus((index - 1 + days.length) % days.length);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  moveFocus(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  moveFocus(days.length - 1);
                }
              }}
              className={
                selected
                  ? "min-h-11 w-full rounded-md border border-amber-200/40 bg-amber-100 px-3 py-2 text-left text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                  : "min-h-11 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-left text-stone-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
              }
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-80">{tabContent.dateLine}</span>
              <span className="mt-0.5 block text-sm font-semibold leading-5">{tabContent.titleLine}</span>
              {tabContent.venueLine ? (
                <span className="mt-0.5 block text-[11px] leading-4 opacity-80">{tabContent.venueLine}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id={`schedule-day-panel-${activeDayIndex}`}
        role="tabpanel"
        aria-labelledby={`schedule-day-tab-${activeDayIndex}`}
        className="relative space-y-5 sm:space-y-6"
      >
        {activeDay.sections.length ? (
          <>
            <span
              aria-hidden
              className="absolute bottom-0 left-[63px] top-0 w-px bg-white/10 sm:left-[75px]"
            />
            {activeDay.sections.map((section, sectionIndex) => (
              <section
                key={`${activeDay.day}-${section.title}-${sectionIndex}`}
                className="grid grid-cols-[52px_1fr] gap-4 sm:grid-cols-[64px_1fr] sm:gap-5"
              >
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-stone-100">{section.startLabel} -</p>
                  <p className="text-sm text-stone-500">{section.endLabel}</p>
                </div>

                <div className="relative space-y-2">
                  <span
                    aria-hidden
                    className={
                      sectionIndex === 0
                        ? "absolute -left-[10px] top-2 h-2.5 w-2.5 rounded-full border border-amber-300/80 bg-amber-400 sm:-left-[14px]"
                        : "absolute -left-[10px] top-2 h-2.5 w-2.5 rounded-full border border-amber-200/70 bg-zinc-950 sm:-left-[14px]"
                    }
                  />

                  {section.data.map((slot) => (
                    <ScheduleCard key={`${section.title}-${slot.id}`} slot={slot} />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-stone-300">Schedule details for this day will be shared soon.</p>
          </section>
        )}
      </div>

      <p className="inline-flex items-center gap-1 text-[11px] text-stone-500">
        <MapPinIcon className="h-3.5 w-3.5" />
        Times and rooms are subject to updates.
      </p>
    </div>
  );
}
