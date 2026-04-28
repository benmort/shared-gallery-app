import type { SummitRecord } from "@/lib/summit/types";

const DEFAULT_IMAGE =
  "https://st2.depositphotos.com/6628792/10189/v/450/depositphotos_101899918-stock-illustration-location-photo-icon.jpg";
const HEADSHOT_IMAGE =
  "https://media.istockphoto.com/id/1214428300/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=vftMdLhldDx9houN4V-g3C9k0xl6YeBcoB_Rk6Trce0=";

type Attachment = {
  url?: string;
  thumbnails?: {
    large?: { url?: string };
  };
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && "url" in entry) {
          return String((entry as { url?: unknown }).url ?? "");
        }
        return String(entry ?? "");
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) return [value];
  return [];
}

export function fieldString(record: SummitRecord, name: string): string {
  const value = record.fields[name];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function fieldFirst(record: SummitRecord, name: string): string {
  return asStringArray(record.fields[name])[0] ?? "";
}

export function fieldList(record: SummitRecord, name: string): string[] {
  return asStringArray(record.fields[name]);
}

export function fieldAttachmentUrl(
  record: SummitRecord,
  name: string,
  options?: { headshot?: boolean },
): string {
  const raw = record.fields[name];
  const first = Array.isArray(raw) ? (raw[0] as Attachment | undefined) : undefined;
  if (first?.thumbnails?.large?.url) return first.thumbnails.large.url;
  if (first?.url) return first.url;
  return options?.headshot ? HEADSHOT_IMAGE : DEFAULT_IMAGE;
}

export function boolField(record: SummitRecord, name: string): boolean {
  return record.fields[name] === true;
}

export function listIncludes(record: SummitRecord, fieldName: string, id: string): boolean {
  const list = fieldList(record, fieldName);
  return list.includes(id);
}
