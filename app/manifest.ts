import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Event album",
    short_name: "Album",
    description:
      "Share photos from the day — upload from your phone and browse the album.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        type: "image/png",
        sizes: "32x32",
      },
    ],
  };
}
