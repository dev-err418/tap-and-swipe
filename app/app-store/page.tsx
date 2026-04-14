import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Store Insights — Tap & Swipe",
  description:
    "App Store data and insights: top grossing apps, trends, and what indie developers can learn from the charts.",
  openGraph: {
    title: "App Store Insights — Tap & Swipe",
    description:
      "App Store data and insights: top grossing apps, trends, and what indie developers can learn from the charts.",
    url: "https://tap-and-swipe.com/app-store",
  },
};

export default function AppStorePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        App Store Insights
      </h1>
      <p className="mt-3 text-lg text-black/50">
        Data and trends from the App Store — what&apos;s working for indie
        developers right now.
      </p>

      <div className="mt-16 rounded-2xl border border-black/10 p-8 text-center">
        <p className="text-lg font-medium text-black/60">Coming soon</p>
        <p className="mt-2 text-sm text-black/40">
          Top grossing breakdowns, category trends, and insights for indie app
          makers.
        </p>
      </div>
    </main>
  );
}
