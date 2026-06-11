import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDraftById } from "@/lib/drafts";
import { EpisodeContent } from "@/components/episode-content";
import { CaseStudyContent } from "@/components/case-study-content";
import { DraftWarningGate } from "@/components/draft-warning-gate";

// Drafts are private review URLs. Don't pre-build, don't index.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const draft = await getDraftById(id);
  return {
    title: draft ? `[Draft] ${draft.data.title}` : "Draft",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await getDraftById(id);
  if (!draft) notFound();

  return (
    <DraftWarningGate>
      {draft.kind === "case-study" ? (
        <CaseStudyContent caseStudy={draft.data} otherCaseStudies={[]} />
      ) : (
        <EpisodeContent episode={draft.data} otherEpisodes={[]} />
      )}
    </DraftWarningGate>
  );
}
