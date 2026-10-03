import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import * as accessHelpers from "../../lib/analytics-access";
import { loadTestModule } from "./helpers/load-test-module";

const albertoId = "643841344103776318";
const noteInput = { title: "Launch", content: "Updated onboarding", appVersion: "1.0", notedAt: "2026-10-03T10:00:00Z" };
type RouteContext = { params: Promise<{ id: string }> };
type Handler = (request: NextRequest, context?: RouteContext) => Promise<Response>;
type Note = typeof noteInput & { id: string; appId: string };

function fixture(discordId: string | null = albertoId, development = false) {
  const access = accessHelpers.getAnalyticsAccess(discordId, { adminDiscordId: "owner", development });
  const mobileCalls: string[] = [];
  const noteCalls: string[] = [];
  const notes: Note[] = [
    { ...noteInput, id: "poky-note", appId: "poky" },
    { ...noteInput, id: "glow-note", appId: "glow", content: "Private Glow note" },
  ];
  const dependencies = {
    "@/lib/analytics-session": { getAnalyticsViewer: async () => access },
    "@/lib/analytics-access": accessHelpers,
    "@/lib/mobile-app-analytics": {
      getMobileAppById: async (_period: string, appId: string) => {
        mobileCalls.push(appId);
        return { experiments: [{ appId }], countries: [] };
      },
    },
    "@/lib/prisma": {
      prisma: { analyticsNote: {
        findMany: async ({ where }: { where: { appId: string } }) => {
          noteCalls.push(`read:${where.appId}`);
          return notes.filter((note) => note.appId === where.appId);
        },
        findFirst: async ({ where }: { where: { id: string; appId: { in: string[] } } }) => {
          noteCalls.push(`lookup:${where.id}`);
          return notes.find((note) => note.id === where.id && where.appId.in.includes(note.appId)) ?? null;
        },
        create: async ({ data }: { data: Omit<Note, "id"> }) => {
          noteCalls.push(`create:${data.appId}`);
          return { id: "new-note", ...data };
        },
        update: async ({ where, data }: { where: { id: string }; data: typeof noteInput }) => {
          noteCalls.push(`update:${where.id}`);
          return { ...notes.find((note) => note.id === where.id), ...data };
        },
        delete: async ({ where }: { where: { id: string } }) => {
          noteCalls.push(`delete:${where.id}`);
          return {};
        },
      } },
    },
    "@/lib/glow-product-queries": { getGlowProductReport: async () => ({ app: "glow" }), getGlowUserJourney: async () => ({ app: "glow" }) },
    "@/lib/versy-product-queries": { getVersyProductReport: async () => ({ app: "versy" }), getVersyUserJourney: async () => ({ app: "versy" }) },
    "@/lib/winback-paywall-queries": { getWinbackPaywallReport: async () => ({ private: true }) },
    "@/lib/versy-paywall-placement-queries": { getVersyPaywallPlacements: async () => ({ private: true }) },
  };
  return { route: (name: string) => loadTestModule<Record<string, Handler>>(`app/api/analytics/${name}/route.ts`, dependencies), mobileCalls, noteCalls };
}

function request(path: string, method = "GET", input?: unknown) {
  return new NextRequest(`https://tap-and-swipe.com/api/analytics/${path}`, {
    method,
    ...(input ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
  });
}

function context(id: string): RouteContext { return { params: Promise.resolve({ id }) }; }

test("Alberto can load Poky's experiments but other app requests never reach the data source", async () => {
  const f = fixture();
  const route = f.route("mobile-app");
  const allowed = await route.GET(request("mobile-app?appId=poky"));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual((await allowed.json()).experiments, [{ appId: "poky" }]);
  for (const appId of ["glow", "versy"]) {
    assert.equal((await route.GET(request(`mobile-app?appId=${appId}`))).status, 403);
  }
  assert.deepEqual(f.mobileCalls, ["poky"]);
});

test("Poky's note reads and creation are scoped to Alberto's allowed app", async () => {
  const f = fixture();
  const route = f.route("notes");
  const response = await route.GET(request("notes?appId=poky"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).notes.map((note: Note) => note.id), ["poky-note"]);
  assert.equal((await route.POST(request("notes", "POST", { ...noteInput, appId: "poky" }))).status, 201);
  for (const appId of ["glow", "versy"]) {
    assert.equal((await route.GET(request(`notes?appId=${appId}`))).status, 403);
    assert.equal((await route.POST(request("notes", "POST", { ...noteInput, appId }))).status, 403);
  }
  assert.deepEqual(f.noteCalls, ["read:poky", "create:poky"]);
});

test("changing a note ID cannot read, edit, or delete another app's note", async () => {
  const f = fixture();
  const route = f.route("notes/[id]");
  assert.equal((await route.PATCH(request("notes/glow-note", "PATCH", { ...noteInput, appId: "poky" }), context("glow-note"))).status, 404);
  assert.equal((await route.DELETE(request("notes/glow-note", "DELETE"), context("glow-note"))).status, 404);
  assert.equal((await route.PATCH(request("notes/poky-note", "PATCH", noteInput), context("poky-note"))).status, 200);
  assert.equal((await route.DELETE(request("notes/poky-note", "DELETE"), context("poky-note"))).status, 200);
  assert.ok(!f.noteCalls.includes("update:glow-note"));
  assert.ok(!f.noteCalls.includes("delete:glow-note"));
});

test("Alberto cannot access Glow, Versy, or winback APIs, including in development", async () => {
  for (const development of [false, true]) {
    const f = fixture(albertoId, development);
    for (const name of ["glow-product", "versy-product", "versy-paywall-placements", "winback-paywall"]) {
      const route = f.route(name);
      assert.equal((await route.GET(request(`${name}?appId=glow`))).status, 401, name);
      if (route.POST) assert.equal((await route.POST(request(name, "POST", { userId: "some-user" }))).status, 401, name);
    }
  }
});

test("unauthenticated and unknown accounts cannot load or mutate analytics", async () => {
  for (const id of [null, "stranger"]) {
    const f = fixture(id);
    assert.equal((await f.route("mobile-app").GET(request("mobile-app?appId=poky"))).status, 401);
    const notes = f.route("notes");
    assert.equal((await notes.GET(request("notes?appId=poky"))).status, 401);
    assert.equal((await notes.POST(request("notes", "POST", { ...noteInput, appId: "poky" }))).status, 401);
    const note = f.route("notes/[id]");
    assert.equal((await note.PATCH(request("notes/poky-note", "PATCH", noteInput), context("poky-note"))).status, 401);
    assert.equal((await note.DELETE(request("notes/poky-note", "DELETE"), context("poky-note"))).status, 401);
    assert.deepEqual(f.mobileCalls, []);
    assert.deepEqual(f.noteCalls, []);
  }
});

test("the owner can still load other apps and edit their notes", async () => {
  const f = fixture("owner");
  assert.equal((await f.route("mobile-app").GET(request("mobile-app?appId=glow"))).status, 200);
  assert.equal((await f.route("glow-product").GET(request("glow-product"))).status, 200);
  assert.equal((await f.route("notes/[id]").PATCH(request("notes/glow-note", "PATCH", noteInput), context("glow-note"))).status, 200);
});
