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

export default async function AppSprintQuizPage() {
  const h = await headers();
  const referer = h.get("referer") || "";
  let serverReferrer: string | undefined;
  if (referer) {
    try {
      serverReferrer = new URL(referer).hostname;
    } catch {
      // invalid URL
    }
  }

  return (
    <Suspense>
      <QuizFunnel serverReferrer={serverReferrer} />
    </Suspense>
  );
}
