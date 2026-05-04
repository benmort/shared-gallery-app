export type SummitVenueGalleryItem = {
  id: string;
  title: string;
  src: string;
  alt: string;
};

function normalizeVenueName(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

export function venueGalleryForName(name: string | null | undefined): SummitVenueGalleryItem[] {
  const normalized = normalizeVenueName(name);
  if (!normalized) return [];

  if (normalized.includes("adelaide oval")) {
    return [
      {
        id: "adelaide-oval-map",
        title: "Adelaide Oval Map",
        src: "/images/venues/adelaide-oval-map.png",
        alt: "Adelaide Oval venue map showing North Gate, South Gate and Bob Quinn Gate with Ian McLachlan Room location.",
      },
      {
        id: "wilson-north-carpark-map",
        title: "Wilson North Carpark Map",
        src: "/images/venues/parking-map.png",
        alt: "Parking map showing Wilson North Carpark and walking route toward Adelaide Oval North Gate.",
      },
    ];
  }

  return [];
}
