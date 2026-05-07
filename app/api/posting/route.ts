import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_PLATFORMS = new Set([
  "linkedin",
  "youtube-long",
  "youtube-shorts",
  "instagram-reels",
]);

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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const platforms = Array.isArray(body.platforms)
    ? body.platforms.map(String).filter((p: string) => VALID_PLATFORMS.has(p))
    : [];
  const publishAtRaw = String(body.publishAt ?? "").trim();
  const publishAt = publishAtRaw ? new Date(publishAtRaw) : null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!publishAt || Number.isNaN(publishAt.getTime())) {
    return NextResponse.json({ error: "publishAt must be a valid date" }, { status: 400 });
  }
  if (platforms.length === 0) {
    return NextResponse.json({ error: "Pick at least one platform" }, { status: 400 });
  }

  const post = await prisma.scheduledPost.create({
    data: { title, description, platforms, publishAt },
  });

  return NextResponse.json({ post });
}
