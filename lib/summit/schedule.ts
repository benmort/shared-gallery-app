import type { SummitRecord } from "@/lib/summit/types";
import { fieldFirst, fieldList, fieldString } from "@/lib/summit/fields";
import { eventImageForTitle } from "@/lib/summit/event-images";

export type ScheduleSlot = {
  id: string;
  talk: boolean;
  title: string;
  speaker?: string;
  room: string;
  summary: string;
  time: string;
  startLabel: string;
  endLabel: string;
  formatLabel?: string;
  locationLabel?: string;
  tags?: string[];
  imageUrl?: string;
  organisation?: string;
};

export type ScheduleSection = {
  title: string;
  startLabel: string;
  endLabel: string;
  data: ScheduleSlot[];
};

export type ScheduleDay = {
  day: string;
  dateLabel?: string;
  dateKey?: string;
  filterDateLabel?: string;
  filterTitle?: string;
  filterVenue?: string;
  sections: ScheduleSection[];
};

type SummitDayFilterMeta = {
  day: string;
  dateLabel: string;
  title: string;
  venue: string;
};

const SUMMIT_2026_DAY_FILTER_META: Record<string, SummitDayFilterMeta> = {
  "2026-05-11": {
    day: "Monday",
    dateLabel: "Monday 11th May",
    title: "Youth Summit Day",
    venue: "Intercontinental Hotel",
  },
  "2026-05-12": {
    day: "Tuesday",
    dateLabel: "Tuesday 12th May",
    title: "First Summit Day",
    venue: "Intercontinental Hotel",
  },
  "2026-05-13": {
    day: "Wednesday",
    dateLabel: "Wednesday 13th May",
    title: "Second Summit Day",
    venue: "Adelaide Oval",
  },
  "2026-05-14": {
    day: "Thursday",
    dateLabel: "Thursday 14th May",
    title: "Last Summit Day",
    venue: "Adelaide Oval",
  },
};

const SUMMIT_2026_DAY_FILTER_ORDER = Object.keys(SUMMIT_2026_DAY_FILTER_META);

function readDay(record: SummitRecord): string {
  return fieldString(record, "Day Of Week") || "Unknown";
}

function readDateValue(record: SummitRecord, fieldName: string): Date | null {
  const raw = fieldFirst(record, fieldName);
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function readDateRaw(record: SummitRecord, fieldName: string): string | null {
  const raw = fieldFirst(record, fieldName);
  return raw || null;
}

type IsoParts = { year: number; month: number; day: number; hour: string; minute: string };

function parseIsoParts(raw: string | null): IsoParts | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4],
    minute: match[5],
  };
}

function toHourLabel(raw: string | null): string {
  const parts = parseIsoParts(raw);
  if (!parts) return "TBC";
  return `${parts.hour}:${parts.minute}`;
}

function toTimeLabel(startRaw: string | null, endRaw: string | null): string {
  const startLabel = toHourLabel(startRaw);
  const endLabel = toHourLabel(endRaw);
  if (startLabel === "TBC" || endLabel === "TBC") return "Unknown time";
  return `${startLabel} - ${endLabel}`;
}

function toDayDateLabel(raw: string | null): string | undefined {
  const parts = parseIsoParts(raw);
  if (!parts) return undefined;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function toDateKey(raw: string | null): string | undefined {
  const parts = parseIsoParts(raw);
  if (!parts) return undefined;
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function sanitizeVenueLabel(rawVenue: string): string {
  const venue = rawVenue.trim();
  if (!venue) return "";
  if (venue.toLowerCase().includes("intercontinental hotel")) return "Intercontinental Hotel";
  if (venue.toLowerCase().includes("adelaide oval")) return "Adelaide Oval";

  const parts = venue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return venue;

  const [first, ...rest] = parts;
  const cleanedRest = rest.filter((part) => {
    const normalized = part.toLowerCase();
    return normalized !== "adelaide" && normalized !== "north terrace" && normalized !== "north adelaide";
  });

  return [first, ...cleanedRest].join(", ");
}

function sortByEndTime(records: SummitRecord[]): SummitRecord[] {
  return [...records].sort((a, b) => {
    const aTime = readDateValue(a, "DateTime End [Schedule]")?.getTime() ?? 0;
    const bTime = readDateValue(b, "DateTime End [Schedule]")?.getTime() ?? 0;
    return aTime - bTime;
  });
}

export function buildScheduleDays(
  schedule: SummitRecord[],
  events: SummitRecord[],
  speakers: SummitRecord[],
): ScheduleDay[] {
  const sortedSchedule = [...schedule].sort((a, b) => {
    const aTime = readDateValue(a, "DateTime Start [Schedule]")?.getTime() ?? 0;
    const bTime = readDateValue(b, "DateTime Start [Schedule]")?.getTime() ?? 0;
    return aTime - bTime;
  });

  const dayBuckets = new Map<string, SummitRecord[]>();
  for (const item of sortedSchedule) {
    const day = readDay(item);
    const existing = dayBuckets.get(day) ?? [];
    existing.push(item);
    dayBuckets.set(day, existing);
  }

  const spaces = sortByEndTime([...events, ...speakers]);

  const days: ScheduleDay[] = [];
  for (const [day, slotsForDay] of dayBuckets) {
    const slots: ScheduleSlot[] = [];

    for (const scheduleItem of slotsForDay) {
      const matching = spaces.find((space) => fieldList(space, "Schedule")[0] === scheduleItem.id);
      if (!matching) continue;

      const startRaw = readDateRaw(matching, "DateTime Start [Schedule]");
      const endRaw = readDateRaw(matching, "DateTime End [Schedule]");
      const venue = sanitizeVenueLabel(fieldFirst(scheduleItem, "Venue Name"));
      const room = fieldString(matching, "Room/Area");
      const talkFormats = fieldList(matching, "Talk Format");
      const tags = fieldList(matching, "Tags");
      const isTalk = talkFormats.length > 0;
      const title = fieldString(matching, "Title");
      const formatLabel = talkFormats[0] || tags[0] || (isTalk ? "Talk" : "Event");
      const roomLabel = [venue, room].filter(Boolean).join(" - ");
      const locationLabel = [room, venue].filter(Boolean).join(" · ");
      const imageUrl = fieldFirst(matching, "Headshot") || (!isTalk ? eventImageForTitle(title) : null) || undefined;

      slots.push({
        id: matching.id,
        talk: isTalk,
        title,
        speaker: fieldString(matching, "Full Name"),
        room: roomLabel || "Location to be confirmed",
        summary: fieldString(matching, "Description"),
        time: toTimeLabel(startRaw, endRaw),
        startLabel: toHourLabel(startRaw),
        endLabel: toHourLabel(endRaw),
        formatLabel,
        locationLabel: locationLabel || roomLabel || undefined,
        tags,
        imageUrl,
        organisation: fieldFirst(matching, "Organisation"),
      });
    }

    const sectionMap = new Map<
      string,
      { slots: ScheduleSlot[]; startLabel: string; endLabel: string }
    >();
    for (const slot of slots) {
      const existing = sectionMap.get(slot.time);
      if (existing) {
        existing.slots.push(slot);
        continue;
      }
      sectionMap.set(slot.time, {
        slots: [slot],
        startLabel: slot.startLabel,
        endLabel: slot.endLabel,
      });
    }

    const sections: ScheduleSection[] = [...sectionMap.entries()].map(([title, value]) => ({
      title,
      startLabel: value.startLabel,
      endLabel: value.endLabel,
      data: value.slots,
    }));
    const firstSlotTime = readDateRaw(slotsForDay[0], "DateTime Start [Schedule]");
    const dateKey = toDateKey(firstSlotTime);
    const summitDayMeta = dateKey ? SUMMIT_2026_DAY_FILTER_META[dateKey] : undefined;
    days.push({
      day,
      dateLabel: toDayDateLabel(firstSlotTime),
      dateKey,
      filterDateLabel: summitDayMeta?.dateLabel,
      filterTitle: summitDayMeta?.title,
      filterVenue: summitDayMeta?.venue,
      sections,
    });
  }

  const hasSummit2026Dates = days.some((day) => !!day.dateKey && !!SUMMIT_2026_DAY_FILTER_META[day.dateKey]);
  if (!hasSummit2026Dates) return days;

  const byDateKey = new Map<string, ScheduleDay>();
  for (const day of days) {
    if (!day.dateKey) continue;
    byDateKey.set(day.dateKey, day);
  }

  const orderedDays = SUMMIT_2026_DAY_FILTER_ORDER.map((dateKey) => {
    const meta = SUMMIT_2026_DAY_FILTER_META[dateKey];
    const existing = byDateKey.get(dateKey);
    if (existing) {
      return {
        ...existing,
        day: meta.day,
        filterDateLabel: meta.dateLabel,
        filterTitle: meta.title,
        filterVenue: meta.venue,
      };
    }
    return {
      day: meta.day,
      dateLabel: meta.dateLabel,
      dateKey,
      filterDateLabel: meta.dateLabel,
      filterTitle: meta.title,
      filterVenue: meta.venue,
      sections: [],
    };
  });

  const trailingDays = days.filter((day) => !day.dateKey || !SUMMIT_2026_DAY_FILTER_META[day.dateKey]);
  return [...orderedDays, ...trailingDays];
}
