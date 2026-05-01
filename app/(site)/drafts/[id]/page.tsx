import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllEpisodes } from "@/lib/episodes";
import { getDraftById } from "@/lib/drafts";
import { EpisodeContent } from "@/components/episode-content";

// Drafts are private review URLs. Don't pre-build, don't index.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const draft = getDraftById(id);
  return {
    title: draft ? `[Draft] ${draft.title}` : "Draft",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = getDraftById(id);
  if (!episode) notFound();

  const otherEpisodes = getAllEpisodes().slice(0, 3);

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-6 pt-6">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          🚧 Draft preview &mdash; not indexed, not listed publicly. Anyone with this URL can view it.
        </div>
      </div>
      <EpisodeContent episode={episode} otherEpisodes={otherEpisodes} />
    </>
  );
}
