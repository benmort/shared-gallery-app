import assert from "node:assert/strict";
import test from "node:test";
import { buildScheduleDays } from "@/lib/summit/schedule";
import type { SummitRecord } from "@/lib/summit/types";

function record(id: string, fields: Record<string, unknown>): SummitRecord {
  return { id, fields };
}

test("buildScheduleDays groups schedule rows by day and time windows", () => {
  const schedule = [
    record("slot-1", {
      "Day Of Week": "Monday",
      "DateTime Start [Schedule]": ["2026-11-01T09:00:00.000Z"],
      "Venue Name": ["Main hall"],
    }),
    record("slot-2", {
      "Day Of Week": "Monday",
      "DateTime Start [Schedule]": ["2026-11-01T10:00:00.000Z"],
      "Venue Name": ["Main hall"],
    }),
  ];

  const speakers = [
    record("speaker-1", {
      Schedule: ["slot-1"],
      "Talk Format": ["Talk"],
      Title: "Opening keynote",
      "Room/Area": "Room A",
      Description: "Kickoff",
      "DateTime Start [Schedule]": ["2026-11-01T09:00:00.000Z"],
      "DateTime End [Schedule]": ["2026-11-01T09:45:00.000Z"],
    }),
  ];
  const events = [
    record("event-1", {
      Schedule: ["slot-2"],
      Title: "Lunch",
      "Room/Area": "Dining",
      Description: "Buffet",
      "DateTime Start [Schedule]": ["2026-11-01T10:00:00.000Z"],
      "DateTime End [Schedule]": ["2026-11-01T10:30:00.000Z"],
    }),
  ];

  const days = buildScheduleDays(schedule, events, speakers);
  assert.equal(days.length, 1);
  assert.equal(days[0]?.day, "Monday");
  assert.equal(days[0]?.sections.length, 2);
  assert.equal(days[0]?.sections[0]?.data[0]?.id, "speaker-1");
  assert.equal(days[0]?.sections[1]?.data[0]?.id, "event-1");
});
