import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllEpisodeSlugs,
  getAllEpisodes,
  getEpisodeBySlug,
} from "@/lib/episodes";
import { EpisodeContent } from "@/components/episode-content";

const BASE_URL = "https://tap-and-swipe.com";

export async function generateStaticParams() {
  return getAllEpisodeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) return {};

  const thumbnail = `https://img.youtube.com/vi/${episode.youtubeId}/maxresdefault.jpg`;

  return {
    title: episode.title,
    description: episode.description,
    keywords: episode.tags,
    openGraph: {
      type: "video.other",
      locale: "en_US",
      siteName: "Tap & Swipe",
      title: episode.title,
      description: episode.description,
      url: `${BASE_URL}/episodes/${slug}`,
      images: [{ url: thumbnail, width: 1280, height: 720 }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@arthursbuilds",
      title: episode.title,
      description: episode.description,
      images: [thumbnail],
    },
    alternates: {
      canonical: `/episodes/${slug}`,
    },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const episode = getEpisodeBySlug(slug);
  if (!episode) notFound();

  const otherEpisodes = getAllEpisodes()
    .filter((s) => s.slug !== slug)
    .slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: episode.title,
      description: episode.description,
      thumbnailUrl: `https://img.youtube.com/vi/${episode.youtubeId}/maxresdefault.jpg`,
      uploadDate: new Date(episode.date).toISOString(),
      embedUrl: `https://www.youtube-nocookie.com/embed/${episode.youtubeId}`,
      ...(episode.guest && {
        contributor: { "@type": "Person", name: episode.guest },
      }),
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
          name: "Episodes",
          item: `${BASE_URL}/episodes`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: episode.title,
          item: `${BASE_URL}/episodes/${slug}`,
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
      <EpisodeContent episode={episode} otherEpisodes={otherEpisodes} />
    </>
  );
}
