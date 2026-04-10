import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Event album",
  description:
    "Share photos from the day — upload from your phone and browse the album.",
  openGraph: {
    title: "Event album",
    description:
      "Share photos from the day — upload from your phone and browse the album.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Event album",
    description:
      "Share photos from the day — upload from your phone and browse the album.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
