import type { Metadata } from "next";
import { getAllCaseStudies } from "@/lib/case-studies";
import { getAppData } from "@/lib/app-data";
import {
  CaseStudiesPageClient,
  type CaseStudyWithGenres,
} from "@/components/case-studies-page-client";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "In-depth case studies of mobile app builders. Real revenue numbers, growth strategies, and honest lessons from indie devs and app founders.",
  openGraph: {
    title: "Case Studies — Tap & Swipe",
    description:
      "In-depth case studies of mobile app builders. Real revenue numbers, growth strategies, and honest lessons from indie devs and app founders.",
    url: "https://tap-and-swipe.com/case-studies",
    type: "website",
    locale: "en_US",
    siteName: "Tap & Swipe",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@arthursbuilds",
    title: "Case Studies — Tap & Swipe",
    description:
      "In-depth case studies of mobile app builders. Real revenue numbers and honest lessons.",
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: "/case-studies",
  },
};

export default function CaseStudiesPage() {
  const caseStudies = getAllCaseStudies();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Case Studies — Tap & Swipe",
    itemListElement: caseStudies.map((cs, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://tap-and-swipe.com/case-studies/${cs.slug}`,
    })),
  };

  const enriched: CaseStudyWithGenres[] = caseStudies.map((cs) => {
    const appData = getAppData(cs.appSlug || cs.slug);
    const genreSet = new Set<string>();
    for (const g of appData?.ios?.genres ?? []) genreSet.add(g);
    for (const g of appData?.android?.genres ?? []) genreSet.add(g);
    const genres = genreSet.size > 0 ? Array.from(genreSet) : undefined;
    return { ...cs, genres };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Case Studies
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Deep dives into how app builders grow and monetize their products.
        </p>

        <CaseStudiesPageClient caseStudies={enriched} />
      </div>
    </>
  );
}
