import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";

export function registerLessonTools(server: McpServer) {
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
