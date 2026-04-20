import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import LessonListClient from "@/components/roadmap/LessonListClient";
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

  const authSession = await auth();
  const discordSession = await getSession();

  let user = null;
  if (authSession?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { id: true },
    });
  } else if (discordSession) {
    user = await prisma.user.findUnique({
      where: { discordId: discordSession.discordId },
      select: { id: true },
    });
  }

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

  const hideProgress = slug === "weekly-calls";
  const currentIndex = CATEGORIES.findIndex((c) => c.slug === slug);
  const nextCategory = CATEGORIES[currentIndex + 1] ?? null;

  const serializedLessons = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    type: l.type,
    videoUrl: l.videoUrl,
    youtubeUrl: l.youtubeUrl,
    markdownContent: l.markdownContent,
    sectionType: l.sectionType,
    order: l.order,
  }));

  return (
    <div className="pt-8">
      <Link
        href="/learn"
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
        slug={slug}
        nextCategory={
          nextCategory
            ? { slug: nextCategory.slug, title: nextCategory.title }
            : null
        }
      />
    </div>
  );
}
