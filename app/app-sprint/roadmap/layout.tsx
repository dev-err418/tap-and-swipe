import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import RoadmapHeader from "@/components/roadmap/RoadmapHeader";

export default async function RoadmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/discord?redirect=roadmap");
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
  });

  if (!user || user.subscriptionStatus !== "active") {
    redirect("/app-sprint?error=not_subscribed");
  }

  // Count global progress for header (exclude weekly-calls replays)
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({
      where: { category: { not: "weekly-calls" } },
    }),
    prisma.lessonProgress.count({
      where: {
        userId: user.id,
        uncheckedAt: null,
        lesson: { category: { not: "weekly-calls" } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#2a2725]">
      <RoadmapHeader
        discordUsername={session.discordUsername}
        discordAvatar={session.discordAvatar}
        discordId={session.discordId}
        totalLessons={totalLessons}
        completedLessons={completedLessons}
      />
      <main className="mx-auto max-w-7xl px-6 pb-24">{children}</main>
    </div>
  );
}
