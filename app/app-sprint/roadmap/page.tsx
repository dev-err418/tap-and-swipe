import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import CategoryCard from "@/components/roadmap/CategoryCard";
import AdminStatsButton from "@/components/roadmap/AdminStatsButton";

export default async function RoadmapPage() {
  const session = (await getSession())!;

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
    select: { id: true },
  });

  const [videos, progress] = await Promise.all([
    prisma.video.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.videoProgress.findMany({ where: { userId: user!.id } }),
  ]);

  const completedVideoIds = new Set(progress.map((p) => p.videoId));

  const isAdmin = session.discordId === process.env.ADMIN_DISCORD_ID;

  // Group videos by category
  const categoryData = CATEGORIES.map((cat) => {
    const catVideos = videos.filter((v) => v.category === cat.slug);
    const completed = catVideos.filter((v) => completedVideoIds.has(v.id)).length;
    return {
      ...cat,
      totalVideos: catVideos.length,
      completedVideos: completed,
    };
  });

  return (
    <div className="pt-8">
      <div className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-[#f1ebe2] sm:text-5xl">
          Course roadmap
        </h1>
        <p className="mt-3 text-lg text-[#c9c4bc]">
          Follow the steps below to build and launch your app. Track your
          progress as you go.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categoryData.map((cat, i) => (
          <CategoryCard
            key={cat.slug}
            slug={cat.slug}
            title={cat.title}
            emoji={cat.emoji}
            totalVideos={cat.totalVideos}
            completedVideos={cat.completedVideos}
            index={i}
          />
        ))}
      </div>

      {isAdmin && (
        <div className="mt-16 flex justify-center">
          <AdminStatsButton />
        </div>
      )}
    </div>
  );
}
