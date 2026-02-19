import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const WHITELISTED_DISCORD_IDS = new Set([
  process.env.ADMIN_DISCORD_ID,
  "372167828964376577",
  "1295748700429357148",
]);

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isWhitelisted = WHITELISTED_DISCORD_IDS.has(session.discordId);

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
    select: { id: true, subscriptionStatus: true },
  });

  if (!user || (user.subscriptionStatus !== "active" && !isWhitelisted)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { lessonId, completed } = body as {
    lessonId: string;
    completed: boolean;
  };

  if (!lessonId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (completed) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: { uncheckedAt: null },
      create: { userId: user.id, lessonId },
    });
  } else {
    await prisma.lessonProgress.updateMany({
      where: { userId: user.id, lessonId },
      data: { uncheckedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
