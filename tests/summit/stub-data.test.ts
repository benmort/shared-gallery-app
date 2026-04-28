import assert from "node:assert/strict";
import test from "node:test";
import stubData from "@/lib/summit/data/data.json";
import { fieldList } from "@/lib/summit/fields";
import { buildScheduleDays } from "@/lib/summit/schedule";
import type { SummitRecord } from "@/lib/summit/types";

type StubShape = {
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

function asRecord(value: unknown): SummitRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { id?: unknown; fields?: unknown };
  if (typeof record.id !== "string") return null;
  if (!record.fields || typeof record.fields !== "object" || Array.isArray(record.fields)) return null;
  return { id: record.id, fields: record.fields as Record<string, unknown> };
}

function asRecords(value: unknown): SummitRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((record): record is SummitRecord => !!record);
}

const stub = stubData as StubShape;

test("single-summit fixture contains full data for all summit routes", () => {
  const summits = asRecords(stub.summits);
  const speakers = asRecords(stub.speakers);
  const events = asRecords(stub.events);
  const schedule = asRecords(stub.schedule);
  const venues = asRecords(stub.venues);
  const crew = asRecords(stub.crew);
  const attractions = asRecords(stub.attractions);
  const organisations = asRecords(stub.organisations);
  const sponsors = asRecords(stub.sponsors);
  const surveys = asRecords(stub.surveys);
  const codeConduct = asRecord(stub.codeConduct);
  const securityGuidelines = asRecord(stub.securityGuidelines);
  const map = asRecord(stub.map);

  assert.equal(summits.length, 1);
  assert.ok(speakers.length > 0);
  assert.ok(events.length > 0);
  assert.ok(schedule.length > 0);
  assert.ok(venues.length > 0);
  assert.ok(crew.length > 0);
  assert.ok(attractions.length > 0);
  assert.ok(organisations.length > 0);
  assert.ok(sponsors.length > 0);
  assert.ok(surveys.length > 0);
  assert.ok(codeConduct);
  assert.ok(securityGuidelines);
  assert.ok(map);
});

test("schedule links in stub data resolve to speaker or event records", () => {
  const schedule = asRecords(stub.schedule);
  const events = asRecords(stub.events);
  const speakers = asRecords(stub.speakers);

  const scheduleIds = new Set(schedule.map((slot) => slot.id));
  const spaces = [...events, ...speakers];

  for (const space of spaces) {
    const firstLinkedSlot = fieldList(space, "Schedule")[0];
    assert.ok(firstLinkedSlot, `record ${space.id} should link to a schedule slot`);
    assert.ok(scheduleIds.has(firstLinkedSlot), `record ${space.id} links to unknown slot ${firstLinkedSlot}`);
  }

  const days = buildScheduleDays(schedule, events, speakers);
  assert.ok(days.length > 0);
  assert.ok(days.some((day) => day.sections.length > 0));
});
