import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Common Threads";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(145deg, #0c0a09 0%, #292524 50%, #0c0a09 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fafaf9",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        Common Threads
      </div>
    ),
    { ...size },
  );
}
