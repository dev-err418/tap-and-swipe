import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUserTier, getCategoryAccess, type UserTier } from "@/lib/premium";
import { CATEGORIES } from "@/lib/roadmap";
import RoadmapHeader from "@/components/roadmap/RoadmapHeader";

const WHITELISTED_DISCORD_IDS = new Set([
  process.env.ADMIN_DISCORD_ID,
  "372167828964376577",
  "1295748700429357148",
]);

const isDev = process.env.NODE_ENV === "development";

export default async function RoadmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // In dev, skip auth to debug course content
  if (!session && !isDev) {
    redirect("/api/auth/discord?redirect=roadmap");
  }

  let user = session
    ? await prisma.user.findUnique({
        where: { discordId: session.discordId },
      })
    : null;

  if (session && !user) {
    const isWhitelisted = WHITELISTED_DISCORD_IDS.has(session.discordId);
    if (isWhitelisted) {
      user = await prisma.user.create({
        data: {
          discordId: session.discordId,
          discordUsername: session.discordUsername,
          discordAvatar: session.discordAvatar,
          subscriptionStatus: "active",
        },
      });
    }
  }

  if (!isDev && (!user || (user.subscriptionStatus !== "active" && !WHITELISTED_DISCORD_IDS.has(session!.discordId)))) {
    redirect("/app-sprint-community?error=not_subscribed");
  }

  const isAdmin = session?.discordId === process.env.ADMIN_DISCORD_ID;
  const realTier = session ? await getUserTier(session.discordId) : "standard";

  const cookieStore = await cookies();
  const debugTierCookie = cookieStore.get("debug-tier")?.value;
  const debugTier =
    isAdmin && debugTierCookie && ["standard", "boilerplate", "full"].includes(debugTierCookie)
      ? (debugTierCookie as UserTier)
      : null;

  const tier = debugTier ?? realTier;

  // Exclude weekly-calls and categories that are hidden or locked from global progress
  const excludedCategories = CATEGORIES
    .filter((c) => c.slug === "weekly-calls" || getCategoryAccess(tier, c.slug) !== "unlocked")
    .map((c) => c.slug);

  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({
      where: { category: { notIn: excludedCategories } },
    }),
    user
      ? prisma.lessonProgress.count({
          where: {
            userId: user.id,
            uncheckedAt: null,
            lesson: { category: { notIn: excludedCategories } },
          },
        })
      : Promise.resolve(0),
  ]);

  return (
    <div className="min-h-screen bg-[#2a2725]">
      <RoadmapHeader
        discordUsername={session?.discordUsername ?? "Dev User"}
        discordAvatar={session?.discordAvatar ?? null}
        discordId={session?.discordId ?? "dev"}
        totalLessons={totalLessons}
        completedLessons={completedLessons}
        isAdmin={isAdmin}
        debugTier={debugTier ?? tier}
      />
      <main className="mx-auto max-w-7xl px-6 pb-24">{children}</main>
    </div>
  );
}
