import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsViewer } from "@/lib/analytics-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 1_000;
const MAX_APP_VERSION_LENGTH = 40;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getAnalyticsViewer();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.analyticsNote.findFirst({
    where: { id, appId: { in: [...access.appIds] } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(input.title ?? "").trim();
  const content = String(input.content ?? "").trim();
  const appVersion = String(input.appVersion ?? "").trim();
  const notedAt = new Date(String(input.notedAt ?? ""));

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be between 1 and ${MAX_TITLE_LENGTH} characters` }, { status: 400 });
  }
  if (!content || content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: `Content must be between 1 and ${MAX_CONTENT_LENGTH} characters` }, { status: 400 });
  }
  if (!appVersion || appVersion.length > MAX_APP_VERSION_LENGTH) {
    return NextResponse.json({ error: `App version must be between 1 and ${MAX_APP_VERSION_LENGTH} characters` }, { status: 400 });
  }
  if (Number.isNaN(notedAt.getTime())) {
    return NextResponse.json({ error: "notedAt must be a valid date" }, { status: 400 });
  }

  const note = await prisma.analyticsNote.update({
    where: { id },
    data: { title, content, appVersion, notedAt },
  });

  return NextResponse.json({ note });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getAnalyticsViewer();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const note = await prisma.analyticsNote.findFirst({
    where: { id, appId: { in: [...access.appIds] } },
  });
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.analyticsNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
