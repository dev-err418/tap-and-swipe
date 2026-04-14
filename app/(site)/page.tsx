import type { Metadata } from "next";
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
        url: `${BASE_URL}/episodes/${ep.slug}`,
      })),
    }),
  };

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Arthur Spalanzani",
    alternateName: ["ArthurBuildsStuff", "Arthur Builds Stuff"],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero showSubscribe={showSubscribe} />
      <EpisodesSection />
    </>
  );
}
