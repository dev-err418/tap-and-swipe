import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-between bg-[#2a2725] px-4 py-8 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      {/* Spacer for vertical centering */}
      <div />

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


        <div className="mt-8">
          <a
            href="/app-sprint"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#f4cf8f] px-8 text-base font-semibold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20"
          >
            Check App Sprint
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
