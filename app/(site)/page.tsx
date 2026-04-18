import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { StoriesSection } from "@/components/stories-section";
import { CaseStudiesSection } from "@/components/case-studies-section";
import { getAllStories } from "@/lib/stories";
import { getAllCaseStudies } from "@/lib/case-studies";

export const metadata: Metadata = {
  title: "Real Stories From People Building Mobile Apps",
  description:
    "Every week, Arthur interviews a mobile app builder about their product, growth, revenue, and mistakes. Case studies with real numbers from indie devs and app founders.",
  keywords: [
    "mobile app builder stories",
    "indie app developer",
    "app revenue case study",
    "mobile app growth",
    "react native",
    "expo",
    "app development podcast",
    "ArthurBuildsStuff",
    "Tap & Swipe",
  ],
  openGraph: {
    title: "Tap & Swipe: Real Stories From People Building Mobile Apps",
    description:
      "Every week, Arthur interviews a mobile app builder about their product, growth, revenue, and mistakes. Case studies with real numbers from indie devs and app founders.",
    url: "https://tap-and-swipe.com",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Tap & Swipe: Real Stories From People Building Mobile Apps",
    description:
      "Every week, Arthur interviews a mobile app builder about their product, growth, revenue, and mistakes.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

const BASE_URL = "https://tap-and-swipe.com";

function buildJsonLd() {
  const stories = getAllStories();
  const caseStudies = getAllCaseStudies();

  const videoSeries = {
    "@context": "https://schema.org",
    "@type": "VideoGallery" as string,
    name: "Tap & Swipe",
    description:
      "Every week I sit down with an app builder and ask them everything: the idea, the grind, the failures, and what finally worked.",
    url: BASE_URL,
    webFeed: `${BASE_URL}/rss.xml`,
    author: { "@type": "Person", name: "Arthur", url: `${BASE_URL}` },
    image: `${BASE_URL}/icon.png`,
    inLanguage: "en",
    ...(stories.length > 0 && {
      video: stories.map((s) => ({
        "@type": "VideoObject",
        name: s.title,
        description: s.description,
        datePublished: new Date(s.date).toISOString(),
        url: `${BASE_URL}/stories/${s.slug}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${s.youtubeId}`,
      })),
    }),
    ...(caseStudies.length > 0 && {
      hasPart: caseStudies.map((cs) => ({
        "@type": "BlogPosting",
        name: cs.title,
        description: cs.description,
        datePublished: new Date(cs.date).toISOString(),
        url: `${BASE_URL}/case-studies/${cs.slug}`,
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

  return [videoSeries, person, webSite];
}

export default function Home() {
  const jsonLd = buildJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <StoriesSection />
      <CaseStudiesSection />
    </>
  );
}
