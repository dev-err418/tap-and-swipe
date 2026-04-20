import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Try Auth.js session first, then legacy Discord session
  const authSession = await auth();
  const discordSession = await getSession();

  if (!authSession?.user && !discordSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check: require Discord admin ID (admin features remain Discord-based for now)
  if (discordSession?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, totalLessons] = await Promise.all([
    prisma.user.findMany({
      where: { subscriptionStatus: "active" },
      select: {
        discordId: true,
        discordUsername: true,
        name: true,
        email: true,
        lessonProgress: {
          select: {
            completedAt: true,
            uncheckedAt: true,
            lesson: { select: { category: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.lesson.count(),
  ]);

  const result = users.map((u) => {
    const currentByCategory: Record<string, number> = {};
    const everByCategory: Record<string, number> = {};
    let currentCompleted = 0;
    let lastActivity: Date | null = null;

    for (const p of u.lessonProgress) {
      const cat = p.lesson.category;

      everByCategory[cat] = (everByCategory[cat] || 0) + 1;

      if (!p.uncheckedAt) {
        currentByCategory[cat] = (currentByCategory[cat] || 0) + 1;
        currentCompleted++;
      }

      if (!lastActivity || p.completedAt > lastActivity) {
        lastActivity = p.completedAt;
      }
    }

    const everCompleted = u.lessonProgress.length;

    return {
      discordId: u.discordId,
      discordUsername: u.discordUsername ?? u.name ?? u.email ?? "Unknown",
      currentCompleted,
      everCompleted,
      hasDiscrepancy: currentCompleted !== everCompleted,
      currentByCategory,
      everByCategory,
      lastActivity: lastActivity?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ users: result, totalLessons });
}
