import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/roadmap";
import RoadmapHeader from "@/components/roadmap/RoadmapHeader";

const WHITELISTED_DISCORD_IDS = new Set([
  process.env.ADMIN_DISCORD_ID,
  "372167828964376577",
  "1295748700429357148",
]);

const isDev = process.env.NODE_ENV === "development";

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try Auth.js session first, then fall back to legacy Discord session
  const authSession = await auth();
  const discordSession = await getSession();

  const isAuthenticated = !!authSession?.user || !!discordSession;

  if (!isAuthenticated && !isDev) {
    redirect("/login?callbackUrl=/learn");
  }

  // Resolve the user record
  let user = null;
  if (authSession?.user?.id) {
    user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
    });
  } else if (discordSession) {
    user = await prisma.user.findUnique({
      where: { discordId: discordSession.discordId },
    });
  }

  // Whitelist: auto-create user for whitelisted Discord IDs
  if (discordSession && !user) {
    const isWhitelisted = WHITELISTED_DISCORD_IDS.has(discordSession.discordId);
    if (isWhitelisted) {
      user = await prisma.user.create({
        data: {
          discordId: discordSession.discordId,
          discordUsername: discordSession.discordUsername,
          discordAvatar: discordSession.discordAvatar,
          subscriptionStatus: "active",
        },
      });
    }
  }

  const hasAccess =
    user?.subscriptionStatus === "active" ||
    WHITELISTED_DISCORD_IDS.has(discordSession?.discordId ?? "");

  if (!isDev && (!user || !hasAccess)) {
    redirect("/app-sprint-community?error=not_subscribed");
  }

  const cookieStore = await cookies();
  const theme = cookieStore.get("roadmap-theme")?.value === "dark" ? "dark" : "light";
  const isDark = theme === "dark";

  // Exclude weekly-calls from global progress
  const excludedCategories = CATEGORIES
    .filter((c) => c.slug === "weekly-calls")
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

  // Display name: prefer Auth.js user, then Discord session
  const displayName = authSession?.user?.name ?? discordSession?.discordUsername ?? "Dev User";
  const displayAvatar = authSession?.user?.image ?? discordSession?.discordAvatar ?? null;
  const displayId = discordSession?.discordId ?? user?.id ?? "dev";

  return (
    <>
    <style>{`html, body { background-color: ${isDark ? "#1a1a1a" : "#fff"} !important; }`}</style>
    <div className={`min-h-screen ${isDark ? "dark bg-[#1a1a1a]" : "bg-white"}`}>
      <RoadmapHeader
        discordUsername={displayName}
        discordAvatar={displayAvatar}
        discordId={displayId}
        totalLessons={totalLessons}
        completedLessons={completedLessons}
        theme={theme}
      />
      <main className="mx-auto max-w-7xl px-6 pb-24">{children}</main>
    </div>
    </>
  );
}
