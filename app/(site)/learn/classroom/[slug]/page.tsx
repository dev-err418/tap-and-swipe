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

  const session = await getSession();

  const user = session
    ? await prisma.user.findUnique({
        where: { discordId: session.discordId },
        select: { id: true },
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

  const hideProgress = slug === "weekly-calls";

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
    <div>
      <Link
        href="/learn/classroom"
        className="inline-flex items-center gap-2 text-sm text-black/50 hover:text-black transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to roadmap
      </Link>

      <LessonListClient
        lessons={serializedLessons}
        initialCompletedIds={completedLessonIds}
        hideProgress={hideProgress}
        categoryTitle={category.title}
        categorySubtitle={category.subtitle}
      />
    </div>
  );
}
