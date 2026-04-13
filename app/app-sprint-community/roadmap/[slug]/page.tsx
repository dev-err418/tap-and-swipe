import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import { getUserTier, getCategoryAccess, type UserTier } from "@/lib/premium";
import LessonListClient from "@/components/roadmap/LessonListClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const session = await getSession();

  const isAdmin = session?.discordId === process.env.ADMIN_DISCORD_ID;
  const realTier = session ? await getUserTier(session.discordId) : "standard";

  const cookieStore = await cookies();
  const debugTierCookie = cookieStore.get("debug-tier")?.value;
  const tier =
    isAdmin && debugTierCookie && ["standard", "boilerplate", "full"].includes(debugTierCookie)
      ? (debugTierCookie as UserTier)
      : realTier;
  const access = getCategoryAccess(tier, slug);

  if (access === "hidden") notFound();

  const isLocked = access === "locked";

  const user = session
    ? await prisma.user.findUnique({
        where: { discordId: session.discordId },
        select: { id: true, githubUsername: true },
      })
    : null;

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      where: { category: slug },
      orderBy: { order: "asc" },
    }),
    user
      ? prisma.lessonProgress.findMany({
          where: {
            userId: user.id,
            lesson: { category: slug },
            uncheckedAt: null,
          },
        })
      : Promise.resolve([]),
  ]);

  const completedLessonIds = progress.map((p) => p.lessonId);

  // Auto-complete the GitHub connect lesson if user has connected
  if (slug === "build-with-boilerplate" && user?.githubUsername && !isLocked) {
    const githubLesson = lessons.find(
      (l) => l.sectionType === "github-connect"
    );
    if (githubLesson && !completedLessonIds.includes(githubLesson.id)) {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: { userId: user.id, lessonId: githubLesson.id },
        },
        update: { uncheckedAt: null },
        create: { userId: user.id, lessonId: githubLesson.id },
      });
      completedLessonIds.push(githubLesson.id);
    }
  }

  const hideProgress = slug === "weekly-calls";
  const currentIndex = CATEGORIES.findIndex((c) => c.slug === slug);
  const nextCategory = CATEGORIES[currentIndex + 1] ?? null;

  const serializedLessons = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    type: l.type,
    youtubeUrl: l.youtubeUrl,
    markdownContent: l.markdownContent,
    sectionType: l.sectionType,
    order: l.order,
  }));

  const githubUsername =
    slug === "build-with-boilerplate" ? (user?.githubUsername ?? null) : null;
  const githubStatus =
    slug === "build-with-boilerplate"
      ? typeof query.github_status === "string"
        ? query.github_status
        : null
      : null;

  return (
    <div className="pt-8">
      <Link
        href="/app-sprint-community/roadmap"
        className="inline-flex items-center gap-2 text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to roadmap
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{category.emoji}</span>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            {category.title}
          </h1>
        </div>
      </div>

      <LessonListClient
        lessons={serializedLessons}
        initialCompletedIds={completedLessonIds}
        hideProgress={hideProgress}
        isLocked={isLocked}
        slug={slug}
        nextCategory={
          nextCategory
            ? { slug: nextCategory.slug, title: nextCategory.title }
            : null
        }
        githubUsername={githubUsername}
        githubStatus={githubStatus}
      />
    </div>
  );
}
