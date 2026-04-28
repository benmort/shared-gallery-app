import "server-only";

import type { SummitListDomain, SummitRecord } from "@/lib/summit/types";
import { summitDomainMeta } from "@/lib/summit/domains";
import {
  getAttractionsAll,
  getCrewAll,
  getEventsAll,
  getOrganisationsAll,
  getSpeakersAll,
  getSponsorsAll,
  getVenuesAll,
} from "@/lib/summit/service";

export async function getDomainRecords(
  domain: SummitListDomain,
  summitViewName: string,
): Promise<SummitRecord[]> {
  if (domain === "speakers") return getSpeakersAll(summitViewName);
  if (domain === "events") return getEventsAll(summitViewName);
  if (domain === "venues") return getVenuesAll(summitViewName);
  if (domain === "crew") return getCrewAll(summitViewName);
  if (domain === "attractions") return getAttractionsAll(summitViewName);
  if (domain === "organisations") return getOrganisationsAll();
  return getSponsorsAll(summitViewName);
}

export function domainLabel(domain: SummitListDomain): string {
  return summitDomainMeta[domain].label;
}
