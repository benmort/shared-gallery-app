export type SummitFields = Record<string, unknown>;

export type SummitRecord = {
  id: string;
  fields: SummitFields;
};

export type SummitListDomain =
  | "speakers"
  | "events"
  | "venues"
  | "crew"
  | "attractions"
  | "organisations"
  | "sponsors";

export type DetailSection = {
  label: string;
  value: string;
  href?: string;
};

export type ListItemView = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  tags?: string[];
};

export type DetailView = {
  id: string;
  title: string;
  subtitle?: string | null;
  secondSubtitle?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  sections: DetailSection[];
  body?: string | null;
  summary?: string | null;
  videoUrl?: string | null;
};
