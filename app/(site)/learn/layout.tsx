import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LearnTabs from "@/components/roadmap/LearnTabs";

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

  return (
    <div className="px-6 pb-24">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-10">
          <LearnTabs />
        </div>
        {children}
      </div>
    </div>
  );
}
