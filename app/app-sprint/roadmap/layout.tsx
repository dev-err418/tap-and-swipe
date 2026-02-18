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

  // Count global progress for header
  const [totalVideos, completedVideos] = await Promise.all([
    prisma.video.count(),
    prisma.videoProgress.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="min-h-screen bg-[#2a2725]">
      <RoadmapHeader
        discordUsername={session.discordUsername}
        discordAvatar={session.discordAvatar}
        discordId={session.discordId}
        totalVideos={totalVideos}
        completedVideos={completedVideos}
      />
      <main className="mx-auto max-w-7xl px-6 pb-24">{children}</main>
    </div>
  );
}
