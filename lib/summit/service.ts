import "server-only";

import type { SummitRecord } from "@/lib/summit/types";
import {
  readStubAttractions,
  readStubCodeConduct,
  readStubCrew,
  readStubEvents,
  readStubMap,
  readStubOrganisations,
  readStubSchedule,
  readStubSecurityGuidelines,
  readStubSpeakers,
  readStubSponsors,
  readStubSummits,
  readStubSurveys,
  readStubVenues,
} from "@/lib/summit/stub-data";

const DEFAULT_SUMMIT_VIEW_NAME = "All";

function keepSignature(_summitViewName: string): void {
  // Single-stub mode ignores view filtering but keeps the old call contract.
  void _summitViewName;
}

export async function getSummitsAll(): Promise<SummitRecord[]> {
  return readStubSummits();
}

export async function getOrganisationsAll(): Promise<SummitRecord[]> {
  return readStubOrganisations();
}

export async function getCrewAll(summitViewName = DEFAULT_SUMMIT_VIEW_NAME): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubCrew();
}

export async function getEventsAll(summitViewName = DEFAULT_SUMMIT_VIEW_NAME): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubEvents();
}

export async function getScheduleAll(summitViewName = DEFAULT_SUMMIT_VIEW_NAME): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubSchedule();
}

export async function getSpeakersAll(summitViewName = DEFAULT_SUMMIT_VIEW_NAME): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubSpeakers();
}

export async function getSponsorsAll(summitViewName = DEFAULT_SUMMIT_VIEW_NAME): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubSponsors();
}

export async function getVenuesAll(summitViewName = DEFAULT_SUMMIT_VIEW_NAME): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubVenues();
}

export async function getAttractionsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubAttractions();
}

export async function getCodeConductStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  keepSignature(summitViewName);
  return readStubCodeConduct();
}

export async function getSecurityGuidelinesStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  keepSignature(summitViewName);
  return readStubSecurityGuidelines();
}

export async function getMapStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  keepSignature(summitViewName);
  return readStubMap();
}

export async function getSurveysStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  keepSignature(summitViewName);
  return readStubSurveys();
}
