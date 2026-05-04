import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";

export function registerLessonTools(server: McpServer) {
  server.registerTool(
    "course_outline",
    {
      title: "Course outline",
      description:
        "Full /learn course catalog: every category (slug, title, subtitle, emoji, order) " +
        "with its lessons in display order. Each lesson includes id, title, description, type " +
        "(video|markdown), videoUrl (R2), youtubeUrl, sectionType, and notes (markdownContent). " +
        "Pass `category` to scope to one category slug. Pass `includeNotes=false` to drop the " +
        "markdown body and keep the response small when only titles/links are needed.",
      inputSchema: {
        category: z
          .enum(CATEGORIES.map((c) => c.slug) as [string, ...string[]])
          .optional()
          .describe("Filter to a single category slug. Omit for the full course."),
        includeNotes: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include each lesson's markdownContent (notes). Defaults to true."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ category, includeNotes = true }) => {
      const lessons = await prisma.lesson.findMany({
        where: category ? { category } : undefined,
        orderBy: [{ category: "asc" }, { order: "asc" }],
      });

      const lessonsByCategory = new Map<string, typeof lessons>();
      for (const l of lessons) {
        const arr = lessonsByCategory.get(l.category) ?? [];
        arr.push(l);
        lessonsByCategory.set(l.category, arr);
      }

      const wantedSlugs = category
        ? CATEGORIES.filter((c) => c.slug === category)
        : [...CATEGORIES].sort((a, b) => a.order - b.order);

      const categories = wantedSlugs.map((c) => ({
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        emoji: c.emoji,
        order: c.order,
        lessons: (lessonsByCategory.get(c.slug) ?? []).map((l) => ({
          id: l.id,
          order: l.order,
          title: l.title,
          description: l.description,
          type: l.type,
          videoUrl: l.videoUrl,
          youtubeUrl: l.youtubeUrl,
          sectionType: l.sectionType,
          ...(includeNotes ? { notes: l.markdownContent } : {}),
        })),
      }));

      const result = {
        totalCategories: categories.length,
        totalLessons: categories.reduce((acc, c) => acc + c.lessons.length, 0),
        categories,
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "lessons_progress_summary",
    {
      title: "Lessons progress summary",
      description:
        "Per-category lesson catalog size, total completions (LessonProgress with uncheckedAt=null), and active learners (distinct users with completions in the last 7 days).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const since = new Date(Date.now() - 7 * 86_400_000);
      const [byCategory, completionsByCategory, activeLearnersRow] = await Promise.all([
        prisma.lesson.groupBy({
          by: ["category"],
          _count: { _all: true },
        }),
        prisma.$queryRaw<{ category: string; cnt: bigint }[]>`
          SELECT l.category as category, COUNT(*)::bigint as cnt
          FROM "LessonProgress" lp
          JOIN "Lesson" l ON l.id = lp."lessonId"
          WHERE lp."uncheckedAt" IS NULL
          GROUP BY l.category
        `,
        prisma.$queryRaw<[{ cnt: bigint }]>`
          SELECT COUNT(DISTINCT lp."userId")::bigint as cnt
          FROM "LessonProgress" lp
          WHERE lp."uncheckedAt" IS NULL
            AND lp."completedAt" >= ${since}
        `,
      ]);

      const completionMap = Object.fromEntries(
        completionsByCategory.map((r) => [r.category, Number(r.cnt)]),
      );

      const categories = byCategory.map((r) => ({
        category: r.category,
        lessonCount: r._count._all,
        completions: completionMap[r.category] ?? 0,
      }));

      const result = {
        categories,
        activeLearners7d: Number(activeLearnersRow[0]?.cnt ?? 0),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
