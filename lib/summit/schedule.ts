import type { SummitRecord } from "@/lib/summit/types";
import { fieldFirst, fieldList, fieldString } from "@/lib/summit/fields";

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
  sections: ScheduleSection[];
};

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
      const venue = fieldFirst(scheduleItem, "Venue Name");
      const room = fieldString(matching, "Room/Area");
      const talkFormats = fieldList(matching, "Talk Format");
      const tags = fieldList(matching, "Tags");
      const isTalk = talkFormats.length > 0;
      const formatLabel = talkFormats[0] || tags[0] || (isTalk ? "Talk" : "Event");
      const roomLabel = [venue, room].filter(Boolean).join(" - ");
      const locationLabel = [room, venue].filter(Boolean).join(" · ");

      slots.push({
        id: matching.id,
        talk: isTalk,
        title: fieldString(matching, "Title"),
        speaker: fieldString(matching, "Full Name"),
        room: roomLabel || "Location to be confirmed",
        summary: fieldString(matching, "Description"),
        time: toTimeLabel(startRaw, endRaw),
        startLabel: toHourLabel(startRaw),
        endLabel: toHourLabel(endRaw),
        formatLabel,
        locationLabel: locationLabel || roomLabel || undefined,
        tags,
        imageUrl: fieldFirst(matching, "Headshot"),
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
    days.push({ day, dateLabel: toDayDateLabel(firstSlotTime), sections });
  }

  return days;
}
