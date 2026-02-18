import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
    select: { id: true, subscriptionStatus: true },
  });

  if (!user || user.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { videoId, completed } = body as {
    videoId: string;
    completed: boolean;
  };

  if (!videoId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Validate videoId exists
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (completed) {
    await prisma.videoProgress.upsert({
      where: { userId_videoId: { userId: user.id, videoId } },
      update: {},
      create: { userId: user.id, videoId },
    });
  } else {
    await prisma.videoProgress.deleteMany({
      where: { userId: user.id, videoId },
    });
  }

  return NextResponse.json({ success: true });
}
