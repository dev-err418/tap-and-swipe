import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import LessonCard from "@/components/roadmap/LessonCard";
import ProgressBar from "@/components/roadmap/ProgressBar";
import { ArrowLeft, ArrowRight } from "lucide-react";
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

  const completedLessonIds = new Set(progress.map((p) => p.lessonId));
  const completedCount = completedLessonIds.size;

  const currentIndex = CATEGORIES.findIndex((c) => c.slug === slug);
  const nextCategory = CATEGORIES[currentIndex + 1] ?? null;

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
            <ProgressBar completed={completedCount} total={lessons.length} />
          </div>
          <span className="text-sm text-[#c9c4bc]">
            {completedCount}/{lessons.length} completed
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            id={lesson.id}
            title={lesson.title}
            description={lesson.description}
            type={lesson.type}
            youtubeUrl={lesson.youtubeUrl}
            markdownContent={lesson.markdownContent}
            order={lesson.order}
            completed={completedLessonIds.has(lesson.id)}
            index={i}
          />
        ))}
      </div>

      {nextCategory && (
        <div className="flex justify-end mt-8">
          <Link
            href={`/app-sprint/roadmap/${nextCategory.slug}`}
            className="inline-flex items-center gap-2 text-sm text-[#c9c4bc] hover:text-[#f1ebe2] transition-colors"
          >
            Next: {nextCategory.title}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
