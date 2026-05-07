import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PostingClient from "@/components/posting/PostingClient";
import type { ScheduledPostEvent } from "@/components/posting/PostingCalendar";

export const dynamic = "force-dynamic";

export default async function PostingPage() {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    notFound();
  }

  const postsRaw = await prisma.scheduledPost.findMany({
    orderBy: { publishAt: "asc" },
  });

  const posts: ScheduledPostEvent[] = postsRaw.map((p) => ({
    id: p.id,
    title: p.title,
    publishAt: p.publishAt.toISOString(),
    platforms: p.platforms,
  }));

  return <PostingClient posts={posts} />;
}
