import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          borderRadius: 112,
          fontSize: 220,
          color: "#f8fafc",
          fontWeight: 700,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            border: "34px solid #f59e0b",
            borderTopColor: "transparent",
            borderLeftColor: "transparent",
            transform: "rotate(12deg)",
            opacity: 0.9,
          }}
        />
        CT
      </div>
    ),
    { ...size },
  );
}
