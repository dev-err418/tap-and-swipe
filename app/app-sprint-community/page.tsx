import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import AppSprintJsonLd from "@/components/AppSprintJsonLd";
import FaqJsonLd from "@/components/FaqJsonLd";


export const metadata: Metadata = {
  title: "AppSprint — Build a Mobile App in Weeks, Not Months",
  description:
    "Join the 6-week AppSprint program to build and launch your own mobile app with Expo, React Native, and AI. 63+ makers, weekly group calls, 5/5 rating. €137/mo.",
  keywords: [
    "app sprint",
    "build a mobile app",
    "mobile app course",
    "expo react native course",
    "app development program",
    "indie app maker",
    "launch mobile app",
    "learn to build apps",
    "mobile app builder course",
    "app building community",
  ],
  openGraph: {
    title: "AppSprint — Build a Mobile App in Weeks, Not Months",
    description:
      "Join the 6-week AppSprint program to build and launch your own mobile app with Expo, React Native, and AI. 63+ makers, weekly group calls, 5/5 rating.",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "AppSprint — Build a Mobile App in Weeks, Not Months",
    description:
      "Join the 6-week AppSprint program to build and launch your own mobile app with Expo, React Native, and AI. 63+ makers, weekly group calls, 5/5 rating.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/app-sprint-community",
  },
};

export default function AppSprintPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <>
      <AppSprintJsonLd />
      <FaqJsonLd />
      <LandingPage searchParams={searchParams} />
    </>
  );
}
