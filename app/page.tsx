import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Hero } from "@/components/hero";
import { EpisodesSection } from "@/components/episodes-section";
import { getAllEpisodes } from "@/lib/episodes";

const BLOCKED_COUNTRIES = new Set([
  // Africa
  "DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ",
  "EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG",
  "MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO",
  "ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW",
  // India
  "IN",
]);

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

const BASE_URL = "https://tap-and-swipe.com";

function buildJsonLd() {
  const episodes = getAllEpisodes();

  const podcastSeries = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Tap & Swipe",
    description:
      "Every week I sit down with an app builder and ask them everything: the idea, the grind, the failures, and what finally worked.",
    url: BASE_URL,
    webFeed: `${BASE_URL}/rss.xml`,
    author: { "@type": "Person", name: "Arthur", url: `${BASE_URL}` },
    image: `${BASE_URL}/icon.png`,
    inLanguage: "en",
    ...(episodes.length > 0 && {
      episode: episodes.map((ep) => ({
        "@type": "PodcastEpisode",
        name: ep.title,
        description: ep.description,
        datePublished: new Date(ep.date).toISOString(),
        url: `${BASE_URL}/${ep.slug}`,
      })),
    }),
  };

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Arthur Spalanzani",
    alternateName: "ArthurBuildsStuff",
    url: BASE_URL,
    image:
      "https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj",
    jobTitle: "Founder",
    sameAs: [
      "https://www.youtube.com/@ArthurBuildsStuff",
      "https://www.linkedin.com/in/arthur-spalanzani/",
      "https://x.com/arthursbuilds",
    ],
  };

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tap & Swipe",
    url: BASE_URL,
    description:
      "Real stories from people building mobile apps — the ideas, the grind, and what finally worked.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Tap & Swipe",
      url: BASE_URL,
    },
  };

  return [podcastSeries, person, webSite];
}

export default async function Home() {
  const h = await headers();
  const country = h.get("cf-ipcountry") || "";
  const showSubscribe = !BLOCKED_COUNTRIES.has(country);

  const jsonLd = buildJsonLd();

  return (
    <>
    <style>{`html, body { background-color: #fff !important; }`}</style>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <main className="relative z-10 flex flex-col bg-white text-black selection:bg-black/10">
      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="ArthurBuildsStuff"
            width={32}
            height={32}
            loading="eager"
            className="h-8 w-8 rounded-full"
          />
          <span className="text-sm font-semibold text-black/90">Tap &amp; Swipe</span>
          <a href="https://www.youtube.com/@ArthurBuildsStuff" target="_blank" rel="noopener noreferrer" className="text-sm text-black/40 transition-colors hover:text-black/60">by ArthurBuildsStuff</a>
        </div>
      </nav>

      <Hero showSubscribe={showSubscribe} />

      <EpisodesSection />

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-10 text-sm text-black/40">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="font-semibold text-black/80">Tap &amp; Swipe</p>
            <p className="mt-1 text-black/80">Made with ❤️ in 🇫🇷</p>
            <p className="mt-3">&copy; {new Date().getFullYear()} &middot; TAP &amp; SWIPE SAS</p>
            <p className="mt-1">SIREN: 100454206 &middot; TVA: FR23100454206</p>
          </div>
          <div>
            <p className="font-medium text-black/80">Products</p>
            <ul className="-mx-2 mt-2">
              <li>
                <Link href="/app-sprint-community" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  AppSprint Community
                </Link>
              </li>
              <li>
                <Link href="/aso" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  AppSprint ASO
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-black/80">Social</p>
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
              <li>
                <a href="https://x.com/arthursbuilds" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  X (Twitter)
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
