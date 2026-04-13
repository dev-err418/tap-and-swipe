import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import { getUserTier, getCategoryAccess, type UserTier } from "@/lib/premium";
import CategoryCard from "@/components/roadmap/CategoryCard";
import AdminStatsButton from "@/components/roadmap/AdminStatsButton";

export default async function RoadmapPage() {
  const session = await getSession();

  const user = session
    ? await prisma.user.findUnique({
        where: { discordId: session.discordId },
        select: { id: true },
      })
    : null;

  const isAdmin = session?.discordId === process.env.ADMIN_DISCORD_ID;
  const realTier = session ? await getUserTier(session.discordId) : "standard";

  const cookieStore = await cookies();
  const debugTierCookie = cookieStore.get("debug-tier")?.value;
  const tier =
    isAdmin && debugTierCookie && ["standard", "boilerplate", "full"].includes(debugTierCookie)
      ? (debugTierCookie as UserTier)
      : realTier;

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
    const access = getCategoryAccess(tier, cat.slug);
    const catLessons = lessons.filter((l) => l.category === cat.slug);
    const completed = catLessons.filter((l) =>
      completedLessonIds.has(l.id)
    ).length;
    return {
      ...cat,
      totalLessons: catLessons.length,
      completedLessons: completed,
      access,
    };
  }).filter((cat) => cat.access !== "hidden");

  return (
    <div className="pt-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-5xl">
          Course roadmap
        </h1>
        <p className="mt-3 text-lg text-black/50 dark:text-white/50">
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
              emoji={cat.emoji}
              totalLessons={cat.totalLessons}
              completedLessons={cat.completedLessons}
              index={i}
              locked={cat.access === "locked"}
            />
          ))}
      </div>

      {categoryData
        .filter((cat) => cat.slug === "weekly-calls")
        .map((cat) => (
          <div key={cat.slug} className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white mb-6">
              Bonus
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <CategoryCard
                slug={cat.slug}
                title={cat.title}
                emoji={cat.emoji}
                totalLessons={cat.totalLessons}
                completedLessons={cat.completedLessons}
                index={0}
                hideProgress
              />
            </div>
          </div>
        ))}

      {isAdmin && (
        <div className="mt-16 flex justify-center">
          <AdminStatsButton />
        </div>
      )}
    </div>
  );
}
