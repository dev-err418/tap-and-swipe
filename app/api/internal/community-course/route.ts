import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasCommunityCourseAccess } from "@/lib/community-managed-access";
import { verifyCourseRequest } from "@/lib/community-course-signature";
import { isStarterLocked } from "@/lib/roadmap";

const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 8192) return json({ error: "Invalid body" }, 413);
  if (!verifyCourseRequest(process.env.COMMUNITY_COURSE_API_SECRET,
    request.headers.get("x-course-timestamp"), request.headers.get("x-course-signature"), body)) {
    return json({ error: "Unauthorized" }, 401);
  }
  let input;
  try { input = JSON.parse(body); } catch { return json({ error: "Invalid body" }, 400); }
  if (!input || typeof input.discordId !== "string" || !/^[0-9]{15,22}$/.test(input.discordId)
    || !["user", "lessons", "progress", "stats"].includes(input.action)) return json({ error: "Invalid body" }, 400);

  const isAdmin = Boolean(process.env.ADMIN_DISCORD_ID) && input.discordId === process.env.ADMIN_DISCORD_ID;
  let user = await prisma.user.findUnique({ where: { discordId: input.discordId } });
  // New AppSprint buyers may never have signed in on the old domain.
  // Paid access remains in the membership ledger; do not persist an active override.
  if (!user && (isAdmin || await hasCommunityCourseAccess({ discordId: input.discordId, subscriptionStatus: null }))) {
    user = await prisma.user.upsert({
      where: { discordId: input.discordId }, update: {},
      create: { discordId: input.discordId },
    });
  }
  if (!user || (!isAdmin && !await hasCommunityCourseAccess(user))) return json({ error: "Forbidden" }, 403);

  if (input.action === "user") return json({ id: user.id, tier: user.tier, isAdmin });
  if (input.action === "progress") {
    if (typeof input.lessonId !== "string" || !input.lessonId || typeof input.completed !== "boolean") return json({ error: "Invalid body" }, 400);
    const lesson = await prisma.lesson.findUnique({ where: { id: input.lessonId } });
    if (!lesson) return json({ error: "Lesson not found" }, 404);
    if (user.tier === "starter" && isStarterLocked(lesson.category)) return json({ error: "Forbidden" }, 403);
    if (input.completed) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        update: { uncheckedAt: null }, create: { userId: user.id, lessonId: lesson.id },
      });
    } else {
      await prisma.lessonProgress.updateMany({ where: { userId: user.id, lessonId: lesson.id }, data: { uncheckedAt: new Date() } });
    }
    return json({ success: true });
  }
  if (input.action === "stats") {
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    const [users, totalLessons] = await Promise.all([
      prisma.user.findMany({ where: { subscriptionStatus: "active" }, select: {
        discordId: true, discordUsername: true, name: true, email: true,
        lessonProgress: { select: { completedAt: true, uncheckedAt: true, lesson: { select: { category: true } } } },
      }, orderBy: { updatedAt: "desc" } }), prisma.lesson.count(),
    ]);
    return json({ totalLessons, users: users.map((u) => {
      const currentByCategory: Record<string, number> = {};
      const everByCategory: Record<string, number> = {};
      let currentCompleted = 0;
      let lastActivity: Date | null = null;
      for (const p of u.lessonProgress) {
        const cat = p.lesson.category;
        everByCategory[cat] = (everByCategory[cat] || 0) + 1;
        if (!p.uncheckedAt) { currentByCategory[cat] = (currentByCategory[cat] || 0) + 1; currentCompleted++; }
        if (!lastActivity || p.completedAt > lastActivity) lastActivity = p.completedAt;
      }
      return { discordId: u.discordId, discordUsername: u.discordUsername ?? u.name ?? u.email ?? "Unknown",
        currentCompleted, everCompleted: u.lessonProgress.length, hasDiscrepancy: currentCompleted !== u.lessonProgress.length,
        currentByCategory, everByCategory, lastActivity: lastActivity?.toISOString() ?? null };
    }) });
  }
  if (input.category !== undefined && typeof input.category !== "string") return json({ error: "Invalid body" }, 400);
  if (input.category && user.tier === "starter" && isStarterLocked(input.category)) return json({ error: "Forbidden" }, 403);
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({ where: input.category ? { category: input.category } : {}, orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.lessonProgress.findMany({ where: { userId: user.id, uncheckedAt: null }, select: { lessonId: true } }),
  ]);
  // The overview needs counts, never the content of a locked category.
  return json({ lessons: lessons.map((lesson) => user.tier === "starter" && isStarterLocked(lesson.category)
    ? { ...lesson, description: null, videoUrl: null, youtubeUrl: null, markdownContent: null } : lesson), completedLessonIds: progress.map((p) => p.lessonId) });
}
