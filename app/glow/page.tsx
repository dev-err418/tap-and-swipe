import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glow — Daily Affirmations",
  description:
    "Start your day with positive affirmations, journaling, and mood tracking. Download Glow on the App Store.",
  alternates: {
    canonical: "/glow",
  },
};

export default function GlowPage() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-between px-4 py-8 selection:bg-[#f54e08]/20"
      style={{ backgroundColor: "#FFF8F3", color: "#2C3E5B" }}
    >
      <div />

      <section className="flex flex-col items-center justify-center text-center">
        <a
          href="/"
          className="mb-8 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#6C757D" }}
        >
          ← Tap &amp; Swipe
        </a>

        <h1
          className="font-serif text-6xl font-semibold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl"
          style={{ color: "#f54e08" }}
        >
          Glow
        </h1>

        <p
          className="mt-4 text-lg font-medium sm:text-xl"
          style={{ color: "#2C3E5B" }}
        >
          Daily Affirmations
        </p>

        <p
          className="mt-3 max-w-md text-base"
          style={{ color: "#6C757D" }}
        >
          Journal, mood tracker &amp; positive affirmations to start your day right.
        </p>

        <div className="mt-10">
          <a
            href="https://apps.apple.com/app/id6753347459"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 items-center justify-center rounded-full px-10 text-base font-semibold text-white transition-all hover:opacity-90 hover:ring-4"
            style={{
              backgroundColor: "#f54e08",
              // @ts-expect-error custom hover ring
              "--tw-ring-color": "rgba(245, 78, 8, 0.2)",
            }}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Download on the App Store
          </a>
        </div>
      </section>

      <footer className="w-full text-center text-sm" style={{ color: "#ADB5BD" }}>
        <p className="font-semibold" style={{ color: "#2C3E5B" }}>TAP &amp; SWIPE</p>
        <p className="mt-1">
          <a href="/privacy" className="underline hover:opacity-70">Privacy</a>
          {" · "}
          <a href="/tos" className="underline hover:opacity-70">Terms</a>
        </p>
      </footer>
    </main>
  );
}
