import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVideoStatus } from "@/lib/youtube";
import { sendPushNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

type Result = {
  postId: string;
  action: "confirmed" | "skipped" | "errored";
  detail?: string;
};

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.scheduledPost.findMany({
    where: {
      status: "scheduled",
      publishAt: { lte: new Date() },
      notifiedAt: null,
    },
    take: 25,
  });

  const results: Result[] = [];

  for (const post of due) {
    try {
      if (!post.youtubeVideoId) {
        results.push({ postId: post.id, action: "skipped", detail: "no YT video id" });
        continue;
      }

      const status = await getVideoStatus(post.youtubeVideoId);
      const isPublic = status?.privacyStatus === "public";

      if (!isPublic) {
        results.push({
          postId: post.id,
          action: "skipped",
          detail: `still ${status?.privacyStatus ?? "unknown"}`,
        });
        continue;
      }

      const updated = await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          notifiedAt: new Date(),
        },
      });

      await sendPushNotification({
        title: "Video published",
        subtitle: updated.title,
        body: `Now live on YouTube`,
        url: updated.youtubeUrl ?? undefined,
        thread_id: "posting",
      });

      results.push({ postId: post.id, action: "confirmed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[posting-publish] error for post", post.id, err);
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { lastError: message },
      });
      results.push({ postId: post.id, action: "errored", detail: message });
    }
  }

  return NextResponse.json({ scanned: due.length, results });
}
