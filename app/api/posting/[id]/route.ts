import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAuthorizedClient } from "@/lib/youtube";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (session.discordId !== process.env.ADMIN_DISCORD_ID) return null;
  return session;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.scheduledPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (post.youtubeVideoId && post.status !== "published") {
    try {
      const auth = await getAuthorizedClient();
      const youtube = google.youtube({ version: "v3", auth });
      await youtube.videos.delete({ id: post.youtubeVideoId });
    } catch (err) {
      console.error("[posting] failed to delete YT video", err);
    }
  }

  await prisma.scheduledPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
