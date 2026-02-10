import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-between bg-[#2a2725] px-4 py-8 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      {/* Spacer for vertical centering */}
      <div />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center">
        <h1
          className="font-serif text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-[#f1ebe2]"
        >
          Tap &amp; Swipe
        </h1>

        <p className="mt-6 max-w-2xl text-base text-[#c9c4bc] sm:text-lg">
          Indie developer building mobile apps and helping others do the same
        </p>

        {/* Social Links */}
        <div className="mt-8">
          <a
            href="https://www.youtube.com/@ArthurBuildsStuff"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          >
            <Badge variant="secondary" className="gap-2 rounded-full border border-[#f4cf8f]/20 bg-[#f4cf8f]/10 px-4 py-2 text-base font-normal text-[#f4cf8f] hover:bg-[#f4cf8f]/20">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
              </svg>
              @ArthurBuildsStuff
            </Badge>
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
