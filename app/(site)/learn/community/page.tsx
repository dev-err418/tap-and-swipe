import { MessageSquare, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Post = {
  date: string;
  content: string;
  image?: string;
};

const POSTS: Post[] = [
  {
    date: "Apr 20, 2026",
    content:
      "New lesson dropped: A/B testing your paywall with RevenueCat Experiments. Stop guessing your pricing, test it.",
  },
  {
    date: "Apr 15, 2026",
    content:
      "Reminder: group calls are now twice a week, Wednesdays and Sundays at 9 PM CET. Bring your questions.",
  },
  {
    date: "Apr 10, 2026",
    content:
      "The boilerplate just got a major update. New onboarding flow, RevenueCat v5 integration, and a cleaner project structure. Check the Build with Boilerplate section.",
  },
  {
    date: "Apr 3, 2026",
    content:
      "Welcome to the new community platform. Everything is now in one place: classroom, calendar, and community. No more jumping between tools.",
  },
];

const DISCORD_INVITE = "https://discord.gg/appsprint";

const MEMBERS = [
  { name: "Calmerra", icon: "/community-icons/calmerra.jpg" },
  { name: "Divvy", icon: "/community-icons/divvy.jpg" },
  { name: "Axiom", icon: "/community-icons/axiom.jpg" },
  { name: "Bump Chat", icon: "/community-icons/bump-chat.jpg" },
  { name: "Glow", icon: "/community-icons/glow.jpg" },
  { name: "Plume", icon: "/community-icons/plume.jpg" },
  { name: "BetMe", icon: "/community-icons/betme.jpg" },
  { name: "NetPay", icon: "/community-icons/netpay.jpg" },
  { name: "Revive", icon: "/community-icons/revive.jpg" },
  { name: "Daily Founder", icon: "/community-icons/daily-founder.jpg" },
  { name: "Block Reels", icon: "/community-icons/block-reels.jpg" },
  { name: "Versy", icon: "/community-icons/versy.jpg" },
  { name: "Murmur", icon: "/community-icons/murmur.jpg" },
  { name: "BudgetApp", icon: "/community-icons/budgetapp.jpg" },
];

async function getHasDiscord(): Promise<boolean> {
  const authSession = await auth();
  if (authSession?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { discordId: true },
    });
    return !!user?.discordId;
  }

  const discordSession = await getSession();
  if (discordSession) return true;

  return false;
}

export default async function CommunityPage() {
  const hasDiscord = await getHasDiscord();

  return (
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Community
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Connect with other founders building apps.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Left: Posts */}
        <div className="flex-1 min-w-0 space-y-4">
          {POSTS.map((post, i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
            >
              <p className="text-sm text-black/80 leading-relaxed">
                {post.content}
              </p>
              {post.image && (
                <img
                  src={post.image}
                  alt=""
                  className="mt-3 rounded-xl w-full object-cover"
                />
              )}
              <p className="mt-3 text-xs text-black/30">{post.date}</p>
            </div>
          ))}
        </div>

        {/* Right: Sidebar */}
        <div className="hidden lg:block w-72 shrink-0 space-y-6">
          {/* Discord card */}
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <MessageSquare className="h-5 w-5 text-black/60" />
              <h3 className="font-semibold text-sm">Discord</h3>
            </div>

            {hasDiscord ? (
              <>
                <p className="text-sm text-black/50 mb-4">
                  Join the conversation. Ask questions, share progress, get feedback.
                </p>
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-full bg-black py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-black/80"
                >
                  Open Discord
                </a>
                <p className="mt-3 text-center text-xs text-black/30">
                  80+ members
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-black/50 mb-4">
                  Connect your Discord account to join the private community, get your member role, and chat with other builders.
                </p>
                <a
                  href="/api/auth/discord/link"
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#5865F2] py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#4752C4]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Connect Discord
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </>
            )}
          </div>

          {/* Members */}
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
            <h3 className="font-semibold text-sm mb-4">Members</h3>
            <div className="grid grid-cols-4 gap-2">
              {MEMBERS.map((member) => (
                <img
                  key={member.name}
                  src={member.icon}
                  alt={member.name}
                  title={member.name}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
