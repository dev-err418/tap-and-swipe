import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Tap & Swipe — Indie Developer Building Mobile Apps",
  description:
    "Indie developer studio building mobile apps and helping others do the same. Makers of Versy, Lua, Glow, and the App Sprint program.",
  keywords: [
    "Tap & Swipe",
    "indie maker",
    "ArthurBuildsStuff",
    "mobile app studio",
    "react native",
    "expo",
    "indie app developer",
    "mobile apps",
    "app development",
  ],
  openGraph: {
    title: "Tap & Swipe — Indie Developer Building Mobile Apps",
    description:
      "Indie developer studio building mobile apps and helping others do the same. Makers of Versy, Lua, Glow, and the App Sprint program.",
  },
  twitter: {
    title: "Tap & Swipe — Indie Developer Building Mobile Apps",
    description:
      "Indie developer studio building mobile apps and helping others do the same. Makers of Versy, Lua, Glow, and the App Sprint program.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-between bg-[#2a2725] px-4 pt-4 pb-8 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      {/* My Apps — top right */}
      <nav className="flex w-full items-center justify-end gap-3">
        {[
          { href: "/versy", icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/d2/2f/af/d22faf4e-b6a4-a079-1a21-5a359b96ad5c/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/100x100bb.jpg", name: "Versy" },
          { href: "/lua", icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/49/66/c6/4966c62d-1319-9349-d7d6-a8bb3238bd99/lua-0-0-1x_U007ephone-0-1-sRGB-85-220.png/100x100bb.jpg", name: "Lua" },
          { href: "/glow", icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/29/74/3a/29743a82-fd07-8495-0e78-767fb4c64467/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/100x100bb.jpg", name: "Glow" },
        ].map((app) => (
          <a key={app.href} href={app.href} className="flex flex-col items-center gap-1 transition-opacity hover:opacity-80">
            <img src={app.icon} alt={app.name} className="h-9 w-9 rounded-xl" />
            <span className="text-[10px] text-[#c9c4bc]/60">{app.name}</span>
          </a>
        ))}
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center">
        <a
          href="https://www.youtube.com/@ArthurBuildsStuff"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
        >
          <img
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="ArthurBuildsStuff"
            className="h-8 w-8 rounded-full border border-[#f4cf8f]/20"
          />
          <span className="text-sm font-medium text-[#c9c4bc]">By ArthurBuildsStuff</span>
        </a>
        <h1
          className="font-serif text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-[#f1ebe2]"
        >
          Tap &amp; Swipe
        </h1>

        <p className="mt-6 max-w-2xl text-base text-[#c9c4bc] sm:text-lg">
          Indie developer building mobile apps and helping others do the same
        </p>


        <div className="mt-10 flex flex-col items-center gap-3">
          <a
            href="/app-sprint-community"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20"
          >
            App Sprint Community
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="/aso"
            className="group inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-base font-medium text-[#c9c4bc] transition-all hover:bg-white/10"
          >
            App Sprint ASO
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full text-center text-sm text-[#c9c4bc]">
        <p className="font-semibold text-[#f1ebe2]">TAP &amp; SWIPE</p>
        <p className="mt-1">SIREN: 100454206 • TVA: FR23100454206</p>
        <p className="mt-1">Based in 🇫🇷</p>
      </footer>
    </main>
  );
}
