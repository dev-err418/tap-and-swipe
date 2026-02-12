import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tap & Swipe",
    short_name: "Tap & Swipe",
    description:
      "Build and launch your own mobile app with App Sprint — the complete program for indie makers.",
    start_url: "/",
    display: "standalone",
    background_color: "#2a2725",
    theme_color: "#2a2725",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
