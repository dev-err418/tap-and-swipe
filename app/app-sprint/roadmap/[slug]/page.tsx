import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import VideoCard from "@/components/roadmap/VideoCard";
import ProgressBar from "@/components/roadmap/ProgressBar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const session = (await getSession())!;

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
    select: { id: true },
  });

  const [videos, progress] = await Promise.all([
    prisma.video.findMany({
      where: { category: slug },
      orderBy: { order: "asc" },
    }),
    prisma.videoProgress.findMany({
      where: { userId: user!.id, video: { category: slug } },
    }),
  ]);

  const completedVideoIds = new Set(progress.map((p) => p.videoId));
  const completedCount = completedVideoIds.size;

  return (
    <div className="pt-8">
      <Link
        href="/app-sprint/roadmap"
        className="inline-flex items-center gap-2 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to roadmap
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{category.emoji}</span>
          <h1 className="text-3xl font-serif font-bold text-[#f1ebe2]">
            {category.title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <ProgressBar completed={completedCount} total={videos.length} />
          </div>
          <span className="text-sm text-[#c9c4bc]">
            {completedCount}/{videos.length} completed
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {videos.map((video, i) => (
          <VideoCard
            key={video.id}
            id={video.id}
            title={video.title}
            description={video.description}
            youtubeUrl={video.youtubeUrl}
            order={video.order}
            completed={completedVideoIds.has(video.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
