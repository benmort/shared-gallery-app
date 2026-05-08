import type { DetailView, ListItemView, SummitListDomain, SummitRecord } from "@/lib/summit/types";
import { fieldAttachmentUrl, fieldFirst, fieldList, fieldString } from "@/lib/summit/fields";
import { eventImageForTitle } from "@/lib/summit/event-images";

type DomainMeta = {
  table: string;
  label: string;
  filterBySummit: boolean;
  imageField: string;
  imageHeadshot?: boolean;
  titleField: string;
  subtitleField?: string;
  subtitleFirstOnly?: boolean;
  descriptionField?: string;
  tagsField?: string;
};

const CREW_PHONE_ICON_IDS = new Set([
  "crew-allara-briggs-pattison",
  "crew-jay-knapp",
  "crew-nicole-jenkins",
]);

export const summitDomainMeta: Record<SummitListDomain, DomainMeta> = {
  speakers: {
    table: "Speakers",
    label: "Speakers",
    filterBySummit: true,
    imageField: "Headshot",
    imageHeadshot: true,
    titleField: "Full Name",
    subtitleField: "Organisation",
    subtitleFirstOnly: true,
    descriptionField: "Title",
    tagsField: "Tags",
  },
  events: {
    table: "Events",
    label: "Events",
    filterBySummit: true,
    imageField: "Headshot",
    imageHeadshot: true,
    titleField: "Title",
    subtitleField: "Venue Name",
    subtitleFirstOnly: true,
    descriptionField: "Description",
    tagsField: "Tags",
  },
  venues: {
    table: "Venues",
    label: "Venues",
    filterBySummit: true,
    imageField: "Image",
    titleField: "Name",
    subtitleField: "Address",
    descriptionField: "Description",
    tagsField: "Tags",
  },
  crew: {
    table: "Crew",
    label: "Crew",
    filterBySummit: true,
    imageField: "Headshot",
    imageHeadshot: true,
    titleField: "Shortname",
    subtitleField: "Organisation [Network Data]",
    subtitleFirstOnly: true,
    tagsField: "Role",
  },
  attractions: {
    table: "Attractions",
    label: "Attractions",
    filterBySummit: true,
    imageField: "Image",
    titleField: "Title",
    subtitleField: "Description",
    tagsField: "Tags",
  },
  organisations: {
    table: "Organisations",
    label: "Organisations",
    filterBySummit: false,
    imageField: "Logo Landscape",
    titleField: "Name",
    subtitleField: "Country",
    descriptionField: "Summary",
  },
  sponsors: {
    table: "Sponsors",
    label: "Sponsors",
    filterBySummit: true,
    imageField: "Logo",
    titleField: "Name",
    subtitleField: "Level",
    descriptionField: "Description",
    tagsField: "Level",
  },
};

export function isSummitDomain(value: string): value is SummitListDomain {
  return value in summitDomainMeta;
}

export function buildListItem(domain: SummitListDomain, record: SummitRecord): ListItemView {
  const meta = summitDomainMeta[domain];
  const title = fieldString(record, meta.titleField) || "Untitled";
  const hasCrewPhone =
    domain === "crew"
      && (fieldString(record, "Phone [Network Data]").trim().length > 0 || CREW_PHONE_ICON_IDS.has(record.id));
  const subtitle = meta.subtitleField
    ? meta.subtitleFirstOnly
      ? fieldFirst(record, meta.subtitleField)
      : fieldString(record, meta.subtitleField)
    : null;
  const tags =
    domain === "speakers"
      ? getSpeakerBadges(record)
      : meta.tagsField
        ? fieldList(record, meta.tagsField)
        : [];
  const airtableImageUrl = fieldAttachmentUrl(record, meta.imageField, { headshot: meta.imageHeadshot });
  const eventImageUrl = domain === "events" ? eventImageForTitle(title) : null;
  return {
    id: record.id,
    title,
    subtitle: subtitle || null,
    description: meta.descriptionField ? fieldString(record, meta.descriptionField) : null,
    imageUrl: eventImageUrl || airtableImageUrl,
    tags,
    hasPhone: hasCrewPhone,
  };
}

function asLines(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n");
  const trimmed = normalized.trim();
  return trimmed.length ? trimmed : null;
}

function asParagraph(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = asLines(value);
  if (!normalized) return null;
  const singleLine = normalized.replace(/\s+/g, " ").trim();
  return singleLine.length ? singleLine : null;
}

export function buildDetail(
  domain: SummitListDomain,
  record: SummitRecord,
): DetailView {
  const presentationLink = sanitizePresentation(fieldFirst(record, "Presentation"));
  switch (domain) {
    case "speakers": {
      return {
        id: record.id,
        title: fieldString(record, "Title") || fieldString(record, "Full Name"),
        subtitle: fieldString(record, "Full Name"),
        secondSubtitle: fieldFirst(record, "Organisation"),
        imageUrl: fieldAttachmentUrl(record, "Headshot", { headshot: true }),
        tags: getSpeakerBadges(record),
        summary: asLines(fieldString(record, "Bio")),
        body: asLines(fieldString(record, "Description")),
        videoUrl: fieldFirst(record, "Video"),
        sections: [
          { label: "Time", value: formatRange(record, "DateTime Start [Schedule]", "DateTime End [Schedule]") },
          { label: "Location", value: `${fieldFirst(record, "Venue Name")} - ${fieldString(record, "Room/Area")}` },
          ...(presentationLink
            ? [{ label: "Presentation", value: presentationLink, href: presentationLink }]
            : []),
        ].filter((section) => section.value),
      };
    }
    case "events": {
      const title = fieldString(record, "Title");
      return {
        id: record.id,
        title,
        subtitle: "Event",
        imageUrl: eventImageForTitle(title) || fieldAttachmentUrl(record, "Headshot", { headshot: true }),
        tags: fieldList(record, "Tags"),
        summary: asLines(fieldString(record, "Description")),
        videoUrl: fieldFirst(record, "Video"),
        sections: [
          { label: "Time", value: formatRange(record, "DateTime Start [Schedule]", "DateTime End [Schedule]") },
          { label: "Location", value: `${fieldFirst(record, "Venue Name")} - ${fieldString(record, "Room/Area")}` },
          ...(presentationLink
            ? [{ label: "Presentation", value: presentationLink, href: presentationLink }]
            : []),
        ].filter((section) => section.value),
      };
    }
    case "venues": {
      const url = fieldString(record, "URL");
      const mapLink = fieldString(record, "Map Link");
      const tripPlannerLink = "https://www.adelaidemetro.com.au/plan-a-trip/visiting-adelaide";
      const parkingLink = fieldString(record, "Parking Link");
      const wilsonEastCarparkVideo = fieldString(record, "Wilson East Carpark Access Video");
      const ovalHotelGuestVideo = fieldString(record, "Oval Hotel Access Video");
      return {
        id: record.id,
        title: fieldString(record, "Name"),
        subtitle: fieldString(record, "Subtitle"),
        imageUrl: fieldAttachmentUrl(record, "Image"),
        tags: fieldList(record, "Tags"),
        body: asParagraph(fieldString(record, "Description")),
        summary: asLines(fieldString(record, "Instructions")),
        sections: [
          {
            label: "Location",
            value: fieldString(record, "Address"),
          },
          { label: "Transport", value: "Plan your trip with Adelaide Metro", href: tripPlannerLink },
          { label: "Parking", value: "View parking details", href: parkingLink },
          ...(wilsonEastCarparkVideo
            ? [
                {
                  label: "Parking Access Video",
                  value: "Click HERE for a video with access details from the Wilson East Carpark",
                  href: wilsonEastCarparkVideo,
                },
              ]
            : []),
          ...(ovalHotelGuestVideo
            ? [
                {
                  label: "Oval Hotel Access Video",
                  value: "Click HERE for a video with access details for guests staying at Oval Hotel",
                  href: ovalHotelGuestVideo,
                },
              ]
            : []),
          { label: "Phone", value: fieldString(record, "Phone"), href: `tel:${fieldString(record, "Phone")}` },
          { label: "Website", value: url, href: url },
          { label: "Map", value: mapLink, href: mapLink },
        ].filter((section) => section.value),
      };
    }
    case "crew": {
      const crewRoles = fieldList(record, "Role");
      const crewEmail = fieldString(record, "Work Email [Network Data]");
      const crewPhone = fieldString(record, "Phone [Network Data]");
      const hasDirectContact = Boolean(crewEmail || crewPhone);
      return {
        id: record.id,
        title: fieldString(record, "Shortname"),
        subtitle: fieldFirst(record, "Organisation [Network Data]"),
        secondSubtitle: null,
        imageUrl: fieldAttachmentUrl(record, "Headshot", { headshot: true }),
        tags: crewRoles.length > 0 ? crewRoles : [fieldString(record, "Role")].filter(Boolean),
        body: null,
        videoUrl: fieldFirst(record, "Video Bio"),
        sections: hasDirectContact
          ? [
              {
                label: "Work Email",
                value: crewEmail,
                href: `mailto:${crewEmail}`,
              },
              {
                label: "Phone",
                value: crewPhone,
                href: `tel:${crewPhone}`,
              },
              { label: "Slack", value: fieldString(record, "Slack"), href: fieldString(record, "Slack") },
              { label: "Whatsapp", value: fieldString(record, "Whatsapp"), href: fieldString(record, "Whatsapp") },
            ].filter((section) => section.value)
          : [],
      };
    }
    case "attractions": {
      const mapLink = fieldString(record, "Map Link");
      return {
        id: record.id,
        title: fieldString(record, "Title"),
        subtitle: "Attraction",
        imageUrl: fieldAttachmentUrl(record, "Image"),
        tags: fieldList(record, "Tags"),
        body: asLines(fieldString(record, "Description")),
        sections: [{ label: "Map", value: mapLink, href: mapLink }].filter(
          (section) => section.value,
        ),
      };
    }
    case "organisations": {
      const url = fieldString(record, "URL");
      return {
        id: record.id,
        title: fieldString(record, "Name"),
        subtitle: fieldString(record, "Country") || "Organisation",
        imageUrl: fieldAttachmentUrl(record, "Logo Landscape") || fieldAttachmentUrl(record, "Logo Box"),
        tags: [],
        summary: asLines(fieldString(record, "Summary")),
        sections: [
          { label: "Website", value: url, href: url },
        ].filter((section) => section.value),
      };
    }
    case "sponsors": {
      const url = fieldString(record, "URL");
      return {
        id: record.id,
        title: fieldString(record, "Name"),
        subtitle: "Sponsor",
        imageUrl: fieldAttachmentUrl(record, "Logo"),
        tags: [fieldString(record, "Level")].filter(Boolean),
        body: asLines(fieldString(record, "Description")),
        sections: [{ label: "Website", value: url, href: url }].filter((section) => section.value),
      };
    }
  }
}

function normalizeSpeakerBadge(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lowered = trimmed.toLowerCase();
  if (lowered === "panel") return "Panel Talk";
  if (lowered === "panel talk") return "Panel Talk";
  if (lowered === "lightning") return "Lightning Talk";
  if (lowered === "lightning talk") return "Lightning Talk";
  if (lowered === "keynote") return "Keynote";
  if (lowered === "international guest") return "International Guest";
  if (lowered === "international guest speaker") return "International Guest";
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.length > 1 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function withUniqueBadge(
  target: string[],
  seen: Set<string>,
  rawValue: string,
): void {
  const normalized = normalizeSpeakerBadge(rawValue);
  if (!normalized) return;
  const key = normalized.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(normalized);
}

export function getSpeakerBadges(record: SummitRecord): string[] {
  const badges: string[] = [];
  const seen = new Set<string>();

  fieldList(record, "Talk Format").forEach((value) => withUniqueBadge(badges, seen, value));
  fieldList(record, "Tags")
    .filter((value) => value.trim().toLowerCase() !== "speaker")
    .forEach((value) => withUniqueBadge(badges, seen, value));

  const context = [fieldString(record, "Title"), fieldString(record, "Description")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (context.includes("international guest")) {
    withUniqueBadge(badges, seen, "International Guest");
  }
  if (badges.length === 0 && context.includes("keynote")) {
    withUniqueBadge(badges, seen, "Keynote");
  }
  if (badges.length === 0 && context.includes("lightning talk")) {
    withUniqueBadge(badges, seen, "Lightning Talk");
  }
  if (badges.length === 0 && context.includes("panel")) {
    withUniqueBadge(badges, seen, "Panel Talk");
  }

  return badges.length > 0 ? badges : ["Speaker"];
}

function formatRange(record: SummitRecord, startField: string, endField: string): string {
  const startRaw = fieldFirst(record, startField);
  const endRaw = fieldFirst(record, endField);
  if (!startRaw || !endRaw) return "";
  const startLabel = formatDateTimeLabel(startRaw);
  const endLabel = formatDateTimeLabel(endRaw);
  if (!startLabel || !endLabel) return "";
  return `${startLabel} - ${endLabel}`;
}

function formatDateTimeLabel(raw: string): string | null {
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4];
  const minute = match[5];
  const dateLabel = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  return `${dateLabel}, ${hour}:${minute}`;
}

function sanitizePresentation(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "https://www.commonthreads.org.au/summit-2026/agenda-overview") return null;
  return value;
}
