import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/hero";

export const metadata: Metadata = {
  title: "Tap & Swipe: Real Stories From People Building Mobile Apps",
  description:
    "Every week I sit down with an app builder and ask them everything: the idea, the grind, the failures, and what finally worked.",
  keywords: [
    "Tap & Swipe",
    "app maker",
    "ArthurBuildsStuff",
    "mobile app studio",
    "react native",
    "expo",
    "app developer",
    "mobile apps",
    "app development",
  ],
  openGraph: {
    title: "Tap & Swipe: Real Stories From People Building Mobile Apps",
    description:
      "Every week I sit down with an app builder and ask them everything: the idea, the grind, the failures, and what finally worked.",
  },
  twitter: {
    title: "Tap & Swipe: Real Stories From People Building Mobile Apps",
    description:
      "Every week I sit down with an app builder and ask them everything: the idea, the grind, the failures, and what finally worked.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
    <style>{`html, body { background-color: #fff !important; }`}</style>
    <main className="relative z-10 flex flex-col bg-white text-black selection:bg-black/10">
      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="ArthurBuildsStuff"
            className="h-8 w-8 rounded-full"
          />
          <span className="text-sm font-semibold text-black/90">Tap &amp; Swipe</span>
          <a href="https://www.youtube.com/@ArthurBuildsStuff" target="_blank" rel="noopener noreferrer" className="text-sm text-black/40 transition-colors hover:text-black/60">by ArthurBuildsStuff</a>
        </div>
      </nav>

      <Hero />

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-10 text-sm text-black/40">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-semibold text-black/80">Tap &amp; Swipe</p>
            <p className="mt-1">Made with ❤️ in 🇫🇷</p>
            <p className="mt-3">&copy; {new Date().getFullYear()} &middot; TAP &amp; SWIPE SAS</p>
            <p className="mt-1">SIREN: 100454206 &middot; TVA: FR23100454206</p>
          </div>
          <div>
            <p className="font-medium text-black/60">Products</p>
            <ul className="-mx-2 mt-2">
              <li>
                <Link href="/app-sprint-community" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  App Sprint Community
                </Link>
              </li>
              <li>
                <Link href="/aso" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  App Sprint ASO
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-black/60">Social</p>
            <ul className="-mx-2 mt-2">
              <li>
                <a href="https://www.youtube.com/@ArthurBuildsStuff" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  YouTube
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/arthur-spalanzani/" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}
