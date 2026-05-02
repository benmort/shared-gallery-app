import type { DetailView, ListItemView, SummitListDomain, SummitRecord } from "@/lib/summit/types";
import { fieldAttachmentUrl, fieldFirst, fieldList, fieldString } from "@/lib/summit/fields";

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
    descriptionField: "Bio",
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
  const subtitle = meta.subtitleField
    ? meta.subtitleFirstOnly
      ? fieldFirst(record, meta.subtitleField)
      : fieldString(record, meta.subtitleField)
    : null;
  const tags = meta.tagsField ? fieldList(record, meta.tagsField) : [];
  return {
    id: record.id,
    title: fieldString(record, meta.titleField) || "Untitled",
    subtitle: subtitle || null,
    description: meta.descriptionField ? fieldString(record, meta.descriptionField) : null,
    imageUrl: fieldAttachmentUrl(record, meta.imageField, { headshot: meta.imageHeadshot }),
    tags,
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
        title: fieldString(record, "Title") || fieldString(record, "Full Name"),
        subtitle: fieldString(record, "Full Name"),
        secondSubtitle: fieldFirst(record, "Organisation"),
        imageUrl: fieldAttachmentUrl(record, "Headshot", { headshot: true }),
        tags: fieldList(record, "Tags"),
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
      return {
        title: fieldString(record, "Title"),
        subtitle: "Event",
        imageUrl: fieldAttachmentUrl(record, "Headshot", { headshot: true }),
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
      return {
        title: fieldString(record, "Shortname"),
        subtitle: fieldFirst(record, "Organisation [Network Data]"),
        secondSubtitle: fieldString(record, "Role"),
        imageUrl: fieldAttachmentUrl(record, "Headshot", { headshot: true }),
        tags: fieldList(record, "Job category [Network Data]"),
        body: asLines(fieldString(record, "Bio")),
        videoUrl: fieldFirst(record, "Video Bio"),
        sections: [
          { label: "Location", value: fieldFirst(record, "Location [Network Data]") },
          {
            label: "Work Email",
            value: fieldString(record, "Work Email [Network Data]"),
            href: `mailto:${fieldString(record, "Work Email [Network Data]")}`,
          },
          {
            label: "Phone",
            value: fieldString(record, "Phone [Network Data]"),
            href: `tel:${fieldString(record, "Phone [Network Data]")}`,
          },
          { label: "Slack", value: fieldString(record, "Slack"), href: fieldString(record, "Slack") },
          { label: "Whatsapp", value: fieldString(record, "Whatsapp"), href: fieldString(record, "Whatsapp") },
          { label: "Languages", value: fieldList(record, "Languages").join(", ") },
        ].filter((section) => section.value),
      };
    }
    case "attractions": {
      const mapLink = fieldString(record, "Map Link");
      return {
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
      return {
        title: fieldString(record, "Name"),
        subtitle: null,
        imageUrl: null,
        tags: [],
        summary: asLines(fieldString(record, "Summary")),
        sections: [
          { label: "Languages", value: fieldList(record, "Languages").join(", ") },
          { label: "Timezones", value: fieldList(record, "Timezones").join(", ") },
          { label: "Executive Director(s)", value: fieldString(record, "Executive Director(s)") },
          { label: "Foreign Minister(s)", value: fieldString(record, "Foreign Minister(s)") },
          { label: "Tech Foreign Minister(s)", value: fieldString(record, "Tech Foreign Minister(s)") },
        ].filter((section) => section.value),
      };
    }
    case "sponsors": {
      const url = fieldString(record, "URL");
      return {
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
