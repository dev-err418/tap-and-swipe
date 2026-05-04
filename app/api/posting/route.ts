import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { uploadVideo } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (session.discordId !== process.env.ADMIN_DISCORD_ID) return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const where: Record<string, unknown> = {};
  if (fromParam || toParam) {
    where.publishAt = {
      ...(fromParam ? { gte: new Date(fromParam) } : {}),
      ...(toParam ? { lte: new Date(toParam) } : {}),
    };
  }

  const posts = await prisma.scheduledPost.findMany({
    where,
    orderBy: { publishAt: "asc" },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = (form.get("description") as string | null)?.toString().trim() || null;
  const caption = (form.get("caption") as string | null)?.toString().trim() || null;
  const tagsRaw = (form.get("tags") as string | null)?.toString().trim() ?? "";
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const platforms = form.getAll("platforms").map((p) => String(p).trim()).filter(Boolean);
  if (platforms.length === 0) platforms.push("youtube");
  const publishAtRaw = String(form.get("publishAt") ?? "").trim();
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!publishAt || Number.isNaN(publishAt.getTime())) {
    return NextResponse.json({ error: "publishAt must be a valid date" }, { status: 400 });
  }

  const file = form.get("video");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "video file is required" }, { status: 400 });
  }

  const post = await prisma.scheduledPost.create({
    data: {
      platforms,
      status: "publishing",
      publishAt,
      title,
      description,
      caption,
      tags,
    },
  });

  try {
    let youtubeVideoId: string | null = null;
    let youtubeUrl: string | null = null;
    if (platforms.includes("youtube")) {
      const stream = Readable.fromWeb(file.stream() as never);
      const result = await uploadVideo({
        title,
        description: description ?? undefined,
        tags,
        publishAt,
        videoStream: stream,
      });
      youtubeVideoId = result.videoId;
      youtubeUrl = result.url;
    }

    const updated = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: "scheduled",
        youtubeVideoId,
        youtubeUrl,
      },
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "failed", lastError: message },
    });
    console.error("[posting] upload failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
