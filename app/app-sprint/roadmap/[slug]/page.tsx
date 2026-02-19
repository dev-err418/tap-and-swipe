import { notFound } from "next/navigation";
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

  const session = (await getSession())!;

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
    select: { id: true },
  });

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({
      where: { category: slug },
      orderBy: { order: "asc" },
    }),
    prisma.lessonProgress.findMany({
      where: {
        userId: user!.id,
        lesson: { category: slug },
        uncheckedAt: null,
      },
    }),
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
    youtubeUrl: l.youtubeUrl,
    markdownContent: l.markdownContent,
    order: l.order,
  }));

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
      </div>

      <LessonListClient
        lessons={serializedLessons}
        initialCompletedIds={completedLessonIds}
        hideProgress={hideProgress}
        slug={slug}
        nextCategory={
          nextCategory ? { slug: nextCategory.slug, title: nextCategory.title } : null
        }
      />
    </div>
  );
}
