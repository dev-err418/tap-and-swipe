import { redirect } from "next/navigation";
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
  const session = await getSession();

  if (!session && !isDev) {
    redirect("/login");
  }

  // Resolve the user record
  let user = session
    ? await prisma.user.findUnique({
        where: { discordId: session.discordId },
      })
    : null;

  // Whitelist: auto-create user for whitelisted Discord IDs
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

  const hasAccess =
    user?.subscriptionStatus === "active" ||
    WHITELISTED_DISCORD_IDS.has(session?.discordId ?? "");

  if (!isDev && (!user || !hasAccess)) {
    redirect("/login?error=not_subscribed");
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
