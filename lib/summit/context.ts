import "server-only";

import { getSummitsAll } from "@/lib/summit/service";
import { fieldString } from "@/lib/summit/fields";
import type { SummitRecord } from "@/lib/summit/types";

export type SummitContext = {
  summits: SummitRecord[];
  selectedSummit: SummitRecord | null;
  selectedSummitName: string;
};

export async function getSummitContext(): Promise<SummitContext> {
  const summits = await getSummitsAll();
  const firstSummit = summits[0] ?? null;
  const selectedSummit = firstSummit;
  const selectedSummitName = selectedSummit ? fieldString(selectedSummit, "Name") || "Summit" : "Summit";
  return { summits, selectedSummit, selectedSummitName };
}
