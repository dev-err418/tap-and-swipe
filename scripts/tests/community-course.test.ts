import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTestModule } from "./helpers/load-test-module";
import { signCourseRequest, verifyCourseRequest } from "../../lib/community-course-signature";
import { isStarterLocked } from "../../lib/roadmap";
import nextConfig from "../../next.config";

const id = "123456789012345678";
function setup({ active = true, tier = null as string | null, missing = false, admin = false } = {}) {
  const writes: unknown[] = [];
  const lesson = { id: "seed-build-with-boilerplate-1", category: "build-with-boilerplate", markdownContent: "private", videoUrl: "private", youtubeUrl: null, description: "private" };
  const user = { id: "existing-user-id", discordId: id, tier, subscriptionStatus: "active" };
  let lookups = 0;
  const prisma = {
    user: {
      findUnique: async () => { lookups++; return missing ? null : user; },
      upsert: async (data: unknown) => { writes.push(data); return user; },
    },
    lesson: { findUnique: async () => lesson, findMany: async () => [lesson] },
    lessonProgress: { findMany: async () => [{ lessonId: lesson.id }], upsert: async (data: unknown) => { writes.push(data); }, updateMany: async (data: unknown) => { writes.push(data); } },
  };
  const route = loadTestModule<{ POST: (request: Request) => Promise<Response> }>("app/api/internal/community-course/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } },
    "@/lib/prisma": { prisma },
    "@/lib/community-managed-access": { hasCommunityCourseAccess: async () => active },
    "@/lib/community-course-signature": { verifyCourseRequest },
    "@/lib/roadmap": { isStarterLocked },
  }, { COMMUNITY_COURSE_API_SECRET: "test-key", ...(admin ? { ADMIN_DISCORD_ID: id } : {}) });
  const request = (input: unknown, signed = true) => {
    const body = JSON.stringify(input), timestamp = String(Date.now());
    return new Request("https://tap-and-swipe.com/api/internal/community-course", { method: "POST", body,
      headers: signed ? { "x-course-timestamp": timestamp, "x-course-signature": signCourseRequest("test-key", timestamp, body) } : {} });
  };
  return { ...route, request, writes, lookups: () => lookups };
}

test("unsigned requests cannot look up identities or mutate progress", async () => {
  const s = setup();
  assert.equal((await s.POST(s.request({ discordId: id, action: "user" }, false))).status, 401);
  assert.equal(s.lookups(), 0);
});
test("expired members cannot read lessons or write progress", async () => {
  const s = setup({ active: false });
  for (const action of ["user", "lessons", "progress", "stats"]) assert.equal((await s.POST(s.request({ discordId: id, action, lessonId: "lesson", completed: true }))).status, 403);
  assert.equal(s.writes.length, 0);
});
test("starter members cannot fetch or mark locked lessons", async () => {
  const s = setup({ tier: "starter" });
  assert.equal((await s.POST(s.request({ discordId: id, action: "lessons", category: "build-with-boilerplate" }))).status, 403);
  assert.equal((await s.POST(s.request({ discordId: id, action: "progress", lessonId: "lesson", completed: true }))).status, 403);
  const data = await (await s.POST(s.request({ discordId: id, action: "lessons" }))).json();
  assert.equal(data.lessons[0].markdownContent, null);
  assert.equal(data.lessons[0].videoUrl, null);
  assert.equal(data.lessons[0].id, "seed-build-with-boilerplate-1");
  assert.equal(s.writes.length, 0);
});
test("progress retains existing user and lesson identities", async () => {
  const s = setup();
  assert.equal((await s.POST(s.request({ discordId: id, action: "progress", lessonId: "seed-build-with-boilerplate-1", completed: true }))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(s.writes[0])), {
    where: { userId_lessonId: { userId: "existing-user-id", lessonId: "seed-build-with-boilerplate-1" } },
    update: { uncheckedAt: null }, create: { userId: "existing-user-id", lessonId: "seed-build-with-boilerplate-1" },
  });
});
test("new paid buyers get a record without a permanent subscription override", async () => {
  const s = setup({ missing: true });
  assert.equal((await s.POST(s.request({ discordId: id, action: "user" }))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(s.writes[0])), { where: { discordId: id }, update: {}, create: { discordId: id } });
  const unpaid = setup({ missing: true, active: false });
  assert.equal((await unpaid.POST(unpaid.request({ discordId: id, action: "user" }))).status, 403);
  assert.equal(unpaid.writes.length, 0);
});
test("stats require the configured administrator", async () => {
  const s = setup();
  assert.equal((await s.POST(s.request({ discordId: id, action: "stats" }))).status, 403);
});
test("legacy roadmap and category redirects point directly to AppSprint", async () => {
  const rules = await nextConfig.redirects!();
  assert.equal(rules.find((rule) => rule.source === "/learn")?.destination, "https://appsprint.app/community/learn");
  for (const rule of rules.filter((rule) => rule.source.includes("roadmap"))) assert.ok(rule.destination.startsWith("https://appsprint.app/community/learn/classroom"));
  assert.ok(rules.some((rule) => rule.source.includes("getting-started") && rule.destination.endsWith("/classroom/:slug")));
  assert.ok(!rules.some((rule) => rule.source === "/learn/:path*")); // Preserve the existing private operations tools.
});
