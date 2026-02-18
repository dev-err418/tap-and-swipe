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

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
    }),
    prisma.lessonProgress.findMany({
      where: { userId: user!.id, uncheckedAt: null },
    }),
  ]);

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  const isAdmin = session.discordId === process.env.ADMIN_DISCORD_ID;

  const categoryData = CATEGORIES.map((cat) => {
    const catLessons = lessons.filter((l) => l.category === cat.slug);
    const completed = catLessons.filter((l) =>
      completedLessonIds.has(l.id)
    ).length;
    return {
      ...cat,
      totalLessons: catLessons.length,
      completedLessons: completed,
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
            totalLessons={cat.totalLessons}
            completedLessons={cat.completedLessons}
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
