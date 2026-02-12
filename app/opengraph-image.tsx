import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Tap & Swipe — Build & Launch Mobile Apps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2a2725",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#f4cf8f",
            marginBottom: 24,
          }}
        >
          Tap & Swipe
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#f1ebe2",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Build & launch mobile apps — the indie maker way
        </div>
      </div>
    ),
    { ...size }
  );
}
