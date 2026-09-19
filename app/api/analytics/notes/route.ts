import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const APP_IDS = new Set(["glow", "poky", "versy"]);
const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 1_000;
const MAX_APP_VERSION_LENGTH = 40;

async function isAuthorized() {
  if (process.env.NODE_ENV === "development") return true;
  const session = await getSession();
  return session?.discordId === process.env.ADMIN_DISCORD_ID;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId")?.trim() ?? "";
  if (!APP_IDS.has(appId)) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }

  const notes = await prisma.analyticsNote.findMany({
    where: { appId },
    orderBy: { notedAt: "asc" },
  });

  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const appId = String(input.appId ?? "").trim();
  const title = String(input.title ?? "").trim();
  const content = String(input.content ?? input.body ?? "").trim();
  const appVersion = String(input.appVersion ?? "").trim();
  const notedAt = new Date(String(input.notedAt ?? ""));

  if (!APP_IDS.has(appId)) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: `Content must be ${MAX_CONTENT_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (!appVersion) {
    return NextResponse.json({ error: "App version is required" }, { status: 400 });
  }
  if (appVersion.length > MAX_APP_VERSION_LENGTH) {
    return NextResponse.json({ error: `App version must be ${MAX_APP_VERSION_LENGTH} characters or fewer` }, { status: 400 });
  }
  if (Number.isNaN(notedAt.getTime())) {
    return NextResponse.json({ error: "notedAt must be a valid date" }, { status: 400 });
  }

  const note = await prisma.analyticsNote.create({
    data: { appId, title, content, appVersion, notedAt },
  });

  return NextResponse.json({ note }, { status: 201 });
}
