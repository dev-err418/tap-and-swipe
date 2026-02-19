import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import AppSprintJsonLd from "@/components/AppSprintJsonLd";
import FaqJsonLd from "@/components/FaqJsonLd";
import ReviewsJsonLd from "@/components/ReviewsJsonLd";

export const metadata: Metadata = {
  title: "App Sprint — Build a Mobile App in Weeks, Not Months",
  description:
    "Join the 6-week App Sprint program to build and launch your own mobile app with Expo, React Native, and AI. 51+ makers, weekly group calls, 5/5 rating. €127/mo.",
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
    title: "App Sprint — Build a Mobile App in Weeks, Not Months",
    description:
      "Join the 6-week App Sprint program to build and launch your own mobile app with Expo, React Native, and AI. 51+ makers, weekly group calls, 5/5 rating.",
  },
  twitter: {
    title: "App Sprint — Build a Mobile App in Weeks, Not Months",
    description:
      "Join the 6-week App Sprint program to build and launch your own mobile app with Expo, React Native, and AI. 51+ makers, weekly group calls, 5/5 rating.",
  },
  alternates: {
    canonical: "/app-sprint",
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
      <ReviewsJsonLd />
      <LandingPage searchParams={searchParams} />
    </>
  );
}
