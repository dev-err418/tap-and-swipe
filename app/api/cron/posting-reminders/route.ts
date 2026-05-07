import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  "linkedin": "LinkedIn",
  "youtube-long": "YouTube Long",
  "youtube-shorts": "YouTube Shorts",
  "instagram-reels": "Instagram Reels",
};

function formatPlatforms(platforms: string[]): string {
  if (platforms.length === 0) return "";
  return platforms.map((p) => PLATFORM_LABEL[p] ?? p).join(" + ");
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.scheduledPost.findMany({
    where: {
      publishAt: { lte: new Date() },
      notifiedAt: null,
    },
    orderBy: { publishAt: "asc" },
    take: 25,
  });

  let sent = 0;
  for (const post of due) {
    try {
      await sendPushNotification({
        title: "Time to post",
        subtitle: formatPlatforms(post.platforms) || post.title,
        body: post.title,
        thread_id: "posting",
        interruption_level: "time-sensitive",
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://tap-and-swipe.com"}/learn/posting`,
      });
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { notifiedAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error("[posting-reminders] failed for", post.id, err);
    }
  }

  return NextResponse.json({ scanned: due.length, sent });
}
