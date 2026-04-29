import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Common Threads",
    template: "%s | Common Threads",
  },
  description:
    "Common Threads summit platform for schedule, speakers, organisations, and community moments.",
  openGraph: {
    title: "Common Threads",
    description:
      "Common Threads summit platform for schedule, speakers, organisations, and community moments.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Common Threads",
    description:
      "Common Threads summit platform for schedule, speakers, organisations, and community moments.",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
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
      <body className="font-sans">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
