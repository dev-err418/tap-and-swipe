import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PostingClient from "@/components/posting/PostingClient";
import type { ScheduledPostEvent } from "@/components/posting/PostingCalendar";

export const dynamic = "force-dynamic";

export default async function PostingPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    notFound();
  }

  const sp = await searchParams;

  const [ytAccount, postsRaw] = await Promise.all([
    prisma.platformAccount.findUnique({ where: { platform: "youtube" } }),
    prisma.scheduledPost.findMany({ orderBy: { publishAt: "asc" } }),
  ]);

  const posts: ScheduledPostEvent[] = postsRaw.map((p) => ({
    id: p.id,
    title: p.title,
    publishAt: p.publishAt.toISOString(),
    status: p.status as ScheduledPostEvent["status"],
    platforms: p.platforms,
    youtubeUrl: p.youtubeUrl,
    instagramUrl: p.instagramUrl,
  }));

  return (
    <div>
      {sp.connected === "youtube" && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          YouTube connected as <strong>{ytAccount?.accountName ?? "channel"}</strong>.
        </div>
      )}
      {sp.error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          OAuth error: {sp.error}
        </div>
      )}

      <PostingClient
        posts={posts}
        ytConnected={!!ytAccount?.refreshToken}
        ytAccountName={ytAccount?.accountName ?? null}
      />
    </div>
  );
}
