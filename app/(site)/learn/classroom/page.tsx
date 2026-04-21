import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import CategoryCard from "@/components/roadmap/CategoryCard";
import AdminStatsButton from "@/components/roadmap/AdminStatsButton";

export default async function ClassroomPage() {
  const session = await getSession();

  const user = session
    ? await prisma.user.findUnique({
        where: { discordId: session.discordId },
        select: { id: true },
      })
    : null;

  const isAdmin = session?.discordId === process.env.ADMIN_DISCORD_ID;

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
    }),
    user
      ? prisma.lessonProgress.findMany({
          where: { userId: user.id, uncheckedAt: null },
        })
      : Promise.resolve([]),
  ]);

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

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
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Course roadmap
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Follow the steps below to build and launch your app. Track your
          progress as you go.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categoryData
          .filter((cat) => cat.slug !== "weekly-calls")
          .map((cat, i) => (
            <CategoryCard
              key={cat.slug}
              slug={cat.slug}
              title={cat.title}
              subtitle={cat.subtitle}
              completedLessons={cat.completedLessons}
              totalLessons={cat.totalLessons}
              image={"image" in cat ? (cat.image as string) : undefined}
              index={i}
            />
          ))}
      </div>

      {isAdmin && (
        <div className="mt-16 flex justify-center">
          <AdminStatsButton />
        </div>
      )}
    </>
  );
}
