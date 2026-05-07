import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
].join("; ");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/community",
        destination: "https://chat.whatsapp.com/IpIrYbPrphO13hCTe8HJJO",
        permanent: false,
      },
      {
        source: "/community/announcements",
        destination: "https://chat.whatsapp.com/ChB0djqZK36HUPWG10Jz0D",
        permanent: false,
      },
      {
        source: "/community/parents-carers",
        destination: "https://chat.whatsapp.com/LPM7SlbKE3IJ9mopSj9q9g",
        permanent: false,
      },
      {
        source: "/community/health-illness",
        destination: "https://chat.whatsapp.com/Kj6yQtTA6U14TAuU8S0rjv",
        permanent: false,
      },
      {
        source: "/community/accessibility-support",
        destination: "https://chat.whatsapp.com/GRtJvk7fXC6JOIifBQUQSE",
        permanent: false,
      },
      {
        source: "/community/wellbeing",
        destination: "https://chat.whatsapp.com/HWOHlfUZ3WVLhZJpavyoVV",
        permanent: false,
      },
      {
        source: "/community/nearby-essentials",
        destination: "https://chat.whatsapp.com/Gmf6n34RDVVLmnHIRYQv9e",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
