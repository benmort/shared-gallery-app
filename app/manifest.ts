import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Common Threads",
    short_name: "Common Threads",
    description:
      "Common Threads summit platform for schedule, speakers, organisations, and community moments.",
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
        purpose: "any",
      },
      {
        src: "/icon",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icon",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
