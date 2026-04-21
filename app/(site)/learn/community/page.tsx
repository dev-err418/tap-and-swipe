import { MessageSquare } from "lucide-react";

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

export default function CommunityPage() {
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
            <p className="text-sm text-black/50 mb-4">
              Join the conversation. Ask questions, share progress, get feedback.
            </p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-full bg-black py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-black/80"
            >
              Join Discord
            </a>
            <p className="mt-3 text-center text-xs text-black/30">
              80+ members
            </p>
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
