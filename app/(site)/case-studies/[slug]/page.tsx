import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllCaseStudies,
  getAllCaseStudySlugs,
  getCaseStudyBySlug,
} from "@/lib/case-studies";
import { CaseStudyContent } from "@/components/case-study-content";
import { authorJsonLd, publisherJsonLd, SITE_URL } from "@/lib/seo/author";

const BASE_URL = SITE_URL;

export async function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) return {};

  const ogImage = cs.image
    ? { url: cs.image, alt: cs.imageAlt || cs.title }
    : { url: "/opengraph-image.png", width: 1200, height: 630 };

  return {
    title: cs.title,
    description: cs.description,
    keywords: cs.tags,
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: "Tap & Swipe",
      title: cs.title,
      description: cs.description,
      url: `${BASE_URL}/case-studies/${slug}`,
      publishedTime: new Date(cs.date).toISOString(),
      ...(cs.updatedDate && {
        modifiedTime: new Date(cs.updatedDate).toISOString(),
      }),
      tags: cs.tags,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@arthursbuilds",
      title: cs.title,
      description: cs.description,
      images: [cs.image || "/opengraph-image.png"],
    },
    alternates: {
      canonical: `/case-studies/${slug}`,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const otherCaseStudies = getAllCaseStudies()
    .filter((other) => other.slug !== slug)
    .slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: cs.title,
      description: cs.description,
      datePublished: new Date(cs.date).toISOString(),
      dateModified: new Date(cs.updatedDate || cs.date).toISOString(),
      author: authorJsonLd,
      publisher: publisherJsonLd,
      mainEntityOfPage: `${BASE_URL}/case-studies/${slug}`,
      ...(cs.image && {
        image: cs.image.startsWith("http")
          ? cs.image
          : `${BASE_URL}${cs.image}`,
      }),
      ...(cs.tags && { keywords: cs.tags.join(", ") }),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Case Studies",
          item: `${BASE_URL}/case-studies`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: cs.title,
          item: `${BASE_URL}/case-studies/${slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CaseStudyContent caseStudy={cs} otherCaseStudies={otherCaseStudies} />
    </>
  );
}
