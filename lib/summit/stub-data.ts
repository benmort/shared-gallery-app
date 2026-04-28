import "server-only";

import rawStubData from "@/lib/summit/data/data.json";
import type { SummitRecord } from "@/lib/summit/types";

type SummitStubRaw = {
  summits?: unknown;
  speakers?: unknown;
  events?: unknown;
  schedule?: unknown;
  venues?: unknown;
  crew?: unknown;
  attractions?: unknown;
  organisations?: unknown;
  sponsors?: unknown;
  surveys?: unknown;
  codeConduct?: unknown;
  securityGuidelines?: unknown;
  map?: unknown;
};

type SummitStubData = {
  summits: SummitRecord[];
  speakers: SummitRecord[];
  events: SummitRecord[];
  schedule: SummitRecord[];
  venues: SummitRecord[];
  crew: SummitRecord[];
  attractions: SummitRecord[];
  organisations: SummitRecord[];
  sponsors: SummitRecord[];
  surveys: SummitRecord[];
  codeConduct: SummitRecord | null;
  securityGuidelines: SummitRecord | null;
  map: SummitRecord | null;
};

const FALLBACK_SUMMIT: SummitRecord = {
  id: "stub-summit-fallback",
  fields: {
    Name: "Stub Summit",
    Location: "TBD",
    "Start Date": "2026-01-01",
    "End Date": "2026-01-01",
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecord(value: unknown): SummitRecord | null {
  if (!isObject(value)) return null;
  const id = value.id;
  const fields = value.fields;
  if (typeof id !== "string" || !id.trim()) return null;
  if (!isObject(fields)) return null;
  return {
    id,
    fields: { ...fields },
  };
}

function normalizeRecordList(value: unknown): SummitRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRecord).filter((record): record is SummitRecord => !!record);
}

function cloneRecord(record: SummitRecord): SummitRecord {
  return { id: record.id, fields: { ...record.fields } };
}

function cloneRecordList(records: SummitRecord[]): SummitRecord[] {
  return records.map(cloneRecord);
}

function warnIfMissing(name: string, value: unknown, normalizedLength?: number): void {
  if (normalizedLength !== undefined) {
    if (normalizedLength === 0) {
      console.warn(`[summit-stub] section "${name}" is empty or invalid.`);
    }
    return;
  }
  if (!value) {
    console.warn(`[summit-stub] section "${name}" is missing or invalid.`);
  }
}

function normalizeStubData(raw: SummitStubRaw): SummitStubData {
  const summitsRaw = normalizeRecordList(raw.summits);
  const summits = summitsRaw.length > 0 ? [summitsRaw[0]] : [FALLBACK_SUMMIT];

  const speakers = normalizeRecordList(raw.speakers);
  const events = normalizeRecordList(raw.events);
  const schedule = normalizeRecordList(raw.schedule);
  const venues = normalizeRecordList(raw.venues);
  const crew = normalizeRecordList(raw.crew);
  const attractions = normalizeRecordList(raw.attractions);
  const organisations = normalizeRecordList(raw.organisations);
  const sponsors = normalizeRecordList(raw.sponsors);
  const surveys = normalizeRecordList(raw.surveys);

  const codeConduct = normalizeRecord(raw.codeConduct);
  const securityGuidelines = normalizeRecord(raw.securityGuidelines);
  const map = normalizeRecord(raw.map);

  warnIfMissing("summits", raw.summits, summitsRaw.length);
  warnIfMissing("speakers", raw.speakers, speakers.length);
  warnIfMissing("events", raw.events, events.length);
  warnIfMissing("schedule", raw.schedule, schedule.length);
  warnIfMissing("venues", raw.venues, venues.length);
  warnIfMissing("crew", raw.crew, crew.length);
  warnIfMissing("attractions", raw.attractions, attractions.length);
  warnIfMissing("organisations", raw.organisations, organisations.length);
  warnIfMissing("sponsors", raw.sponsors, sponsors.length);
  warnIfMissing("surveys", raw.surveys, surveys.length);
  warnIfMissing("codeConduct", codeConduct);
  warnIfMissing("securityGuidelines", securityGuidelines);
  warnIfMissing("map", map);

  return {
    summits,
    speakers,
    events,
    schedule,
    venues,
    crew,
    attractions,
    organisations,
    sponsors,
    surveys,
    codeConduct,
    securityGuidelines,
    map,
  };
}

const stubData = normalizeStubData(rawStubData as SummitStubRaw);

export function readStubSummits(): SummitRecord[] {
  return cloneRecordList(stubData.summits);
}

export function readStubSpeakers(): SummitRecord[] {
  return cloneRecordList(stubData.speakers);
}

export function readStubEvents(): SummitRecord[] {
  return cloneRecordList(stubData.events);
}

export function readStubSchedule(): SummitRecord[] {
  return cloneRecordList(stubData.schedule);
}

export function readStubVenues(): SummitRecord[] {
  return cloneRecordList(stubData.venues);
}

export function readStubCrew(): SummitRecord[] {
  return cloneRecordList(stubData.crew);
}

export function readStubAttractions(): SummitRecord[] {
  return cloneRecordList(stubData.attractions);
}

export function readStubOrganisations(): SummitRecord[] {
  return cloneRecordList(stubData.organisations);
}

export function readStubSponsors(): SummitRecord[] {
  return cloneRecordList(stubData.sponsors);
}

export function readStubSurveys(): SummitRecord[] {
  return cloneRecordList(stubData.surveys);
}

export function readStubCodeConduct(): SummitRecord | null {
  return stubData.codeConduct ? cloneRecord(stubData.codeConduct) : null;
}

export function readStubSecurityGuidelines(): SummitRecord | null {
  return stubData.securityGuidelines ? cloneRecord(stubData.securityGuidelines) : null;
}

export function readStubMap(): SummitRecord | null {
  return stubData.map ? cloneRecord(stubData.map) : null;
}
