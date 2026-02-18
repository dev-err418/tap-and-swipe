import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, totalVideos] = await Promise.all([
    prisma.user.findMany({
      where: { subscriptionStatus: "active" },
      select: {
        discordId: true,
        discordUsername: true,
        videoProgress: {
          select: {
            completedAt: true,
            video: { select: { category: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.video.count(),
  ]);

  const result = users.map((u) => {
    const byCategory: Record<string, number> = {};
    let lastActivity: Date | null = null;

    for (const p of u.videoProgress) {
      byCategory[p.video.category] = (byCategory[p.video.category] || 0) + 1;
      if (!lastActivity || p.completedAt > lastActivity) {
        lastActivity = p.completedAt;
      }
    }

    return {
      discordId: u.discordId,
      discordUsername: u.discordUsername,
      totalCompleted: u.videoProgress.length,
      byCategory,
      lastActivity: lastActivity?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ users: result, totalVideos });
}
