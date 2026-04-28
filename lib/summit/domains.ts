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
    subtitleField: "Location",
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
    subtitleField: "Role",
    descriptionField: "Bio",
    tagsField: "Job category [Network Data]",
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
    tagsField: "Status",
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
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function buildDetail(
  domain: SummitListDomain,
  record: SummitRecord,
): DetailView {
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
          { label: "Presentation", value: fieldFirst(record, "Presentation"), href: fieldFirst(record, "Presentation") },
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
          { label: "Presentation", value: fieldFirst(record, "Presentation"), href: fieldFirst(record, "Presentation") },
        ].filter((section) => section.value),
      };
    }
    case "venues": {
      const url = fieldString(record, "URL");
      const mapLink = fieldString(record, "Map Link");
      return {
        title: fieldString(record, "Name"),
        subtitle: fieldString(record, "Subtitle"),
        imageUrl: fieldAttachmentUrl(record, "Image"),
        tags: fieldList(record, "Tags"),
        body: asLines(fieldString(record, "Description")),
        summary: asLines(fieldString(record, "Instructions")),
        sections: [
          {
            label: "Location",
            value: `${fieldString(record, "Location")}, ${fieldString(record, "Address")}`,
          },
          { label: "Phone", value: fieldString(record, "Phone"), href: `tel:${fieldString(record, "Phone")}` },
          { label: "Email", value: fieldString(record, "Email"), href: `mailto:${fieldString(record, "Email")}` },
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
        subtitle: fieldString(record, "Country"),
        imageUrl: fieldAttachmentUrl(record, "Logo Box"),
        tags: [fieldString(record, "Status")].filter(Boolean),
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
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const startLabel = start.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
  const endLabel = end.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });
  return `${startLabel} - ${endLabel}`;
}
