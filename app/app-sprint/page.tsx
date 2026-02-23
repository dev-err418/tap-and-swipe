import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import QuizFunnel from "@/components/quiz-funnel/QuizFunnel";

export const metadata: Metadata = {
  title: "App Sprint — Discover Your Personalized Action Plan",
  description:
    "Answer 10 questions to get your personalized action plan and launch your mobile app. 1:1 mentorship with Arthur — coaching, code review, and strategy.",
  keywords: [
    "mobile app mentorship",
    "developer coaching",
    "launch an app",
    "app sprint",
    "mobile development mentorship",
    "build a mobile app",
  ],
  openGraph: {
    title: "App Sprint — Discover Your Personalized Action Plan",
    description:
      "Answer 10 questions to get your personalized action plan and launch your mobile app.",
  },
  twitter: {
    title: "App Sprint — Discover Your Personalized Action Plan",
    description:
      "Answer 10 questions to get your personalized action plan and launch your mobile app.",
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
