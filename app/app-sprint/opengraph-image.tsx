import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "App Sprint — Build a Mobile App in Weeks, Not Months";
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
            fontSize: 64,
            fontWeight: 800,
            color: "#f4cf8f",
            marginBottom: 24,
          }}
        >
          App Sprint
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#f1ebe2",
            textAlign: "center",
            maxWidth: 800,
            marginBottom: 40,
          }}
        >
          Build a mobile app in weeks, not months
        </div>
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              color: "#f4cf8f",
              fontWeight: 700,
            }}
          >
            €127/mo
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#c9c4bc",
            }}
          >
            41+ makers
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#c9c4bc",
            }}
          >
            5/5 rating
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
