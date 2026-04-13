import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import QuizFunnel from "@/components/quiz-funnel/QuizFunnel";

export const metadata: Metadata = {
  title: "AppSprint — Get Your Mobile App Built Right",
  description:
    "Take a 2-minute quiz to get a personalized recommendation for your mobile app project. Strategy, development, and launch — tailored to your business.",
  keywords: [
    "mobile app development",
    "app consulting",
    "build a mobile app",
    "app sprint",
    "mobile app strategy",
    "app development services",
  ],
  openGraph: {
    title: "AppSprint — Get Your Mobile App Built Right",
    description:
      "Take a 2-minute quiz to get a personalized recommendation for your mobile app project.",
  },
  twitter: {
    title: "AppSprint — Get Your Mobile App Built Right",
    description:
      "Take a 2-minute quiz to get a personalized recommendation for your mobile app project.",
  },
  alternates: {
    canonical: "/app-sprint",
  },
};

const UA_APP_PATTERNS: [RegExp, string][] = [
  [/YouTube/i, "youtube.com"],
  [/Instagram/i, "instagram.com"],
  [/FBAN|FBAV/i, "facebook.com"],
  [/Twitter/i, "x.com"],
  [/TikTok|BytedanceWebview/i, "tiktok.com"],
  [/LinkedInApp/i, "linkedin.com"],
  [/Pinterest/i, "pinterest.com"],
  [/Snapchat/i, "snapchat.com"],
];

export default async function AppSprintQuizPage() {
  const h = await headers();
  const referer = h.get("referer") || "";
  let serverReferrer: string | undefined;
  if (referer) {
    try {
      serverReferrer = new URL(referer).hostname.replace(/^www\./, "");
    } catch {
      // invalid URL
    }
  }

  // Fallback: detect in-app browsers from User-Agent when no referer
  let serverAppSource: string | undefined;
  if (!serverReferrer) {
    const ua = h.get("user-agent") || "";
    for (const [pattern, source] of UA_APP_PATTERNS) {
      if (pattern.test(ua)) {
        serverAppSource = source;
        break;
      }
    }
  }

  return (
    <Suspense>
      <QuizFunnel serverReferrer={serverReferrer} serverAppSource={serverAppSource} />
    </Suspense>
  );
}
