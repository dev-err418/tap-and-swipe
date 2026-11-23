import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import * as accessHelpers from "../../lib/analytics-access";
import * as platformHelpers from "../../lib/versy-analytics-platform";
import { loadTestModule } from "./helpers/load-test-module";

type Handler = (request: NextRequest) => Promise<Response>;
function fixture(signedIn = true, failing = false) {
  const items = [{ id: "one", appId: "poky", text: "Try a new onboarding", completed: false }];
  const calls: string[] = [];
  const route = loadTestModule<Record<string, Handler>>("app/api/analytics/experiments/route.ts", {
    "@/lib/analytics-access": accessHelpers,
    "@/lib/versy-analytics-platform": platformHelpers,
    "@/lib/analytics-session": { getAnalyticsViewer: async () => signedIn ? { name: "viewer", appIds: ["poky"], canManage: false } : null },
    "@/lib/analytics-experiments": {
      listExperiments: async (appId: string) => { calls.push(appId); if (failing) throw new Error("DB unavailable"); return items; },
      createExperiment: async (appId: string, text: string) => { const item = { id: "two", appId, text, completed: false }; items.push(item); return item; },
      updateExperiment: async (appId: string, id: string, data: object) => { const item = items.find((item) => item.id === id && item.appId === appId); if (item) Object.assign(item, data); return item; },
      deleteExperiment: async (appId: string, id: string) => { const index = items.findIndex((item) => item.id === id && item.appId === appId); if (index < 0) return false; items.splice(index, 1); return true; },
    },
  });
  return { items, calls, request: (method: string, appId = "poky", body?: unknown) => route[method](new NextRequest(`https://example.com/api/analytics/experiments?appId=${appId}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) })) };
}

test("experiment routes require authentication and enforce app access before storage", async () => {
  assert.equal((await fixture(false).request("GET")).status, 401);
  const f = fixture();
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) assert.equal((await f.request(method, "glow", method === "GET" ? undefined : { text: "Test", id: "one" })).status, 403);
  assert.equal((await f.request("GET", "unknown")).status, 400);
  assert.deepEqual(f.calls, []);
});

test("checklists can be added, edited, completed, reopened and deleted", async () => {
  const f = fixture();
  const read = await f.request("GET");
  assert.equal(read.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await read.json()).items.length, 1);
  const created = await f.request("POST", "poky", { text: "  Test pricing  " });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).item.text, "Test pricing");
  for (const data of [{ text: "Updated" }, { completed: true }, { completed: false }]) {
    const response = await f.request("PATCH", "poky", { id: "one", ...data });
    assert.equal(response.status, 200);
    const item = (await response.json()).item;
    for (const [key, value] of Object.entries(data)) assert.equal(item[key], value);
  }
  assert.equal((await f.request("DELETE", "poky", { id: "one" })).status, 200);
  assert.equal((await f.request("PATCH", "poky", { id: "one", completed: true })).status, 404);
  assert.equal((await f.request("DELETE", "poky", { id: "one" })).status, 404);
});

test("invalid text and completion values are rejected without changing items", async () => {
  const f = fixture();
  for (const text of ["", " ", "x".repeat(1001), 123, null]) assert.equal((await f.request("POST", "poky", { text })).status, 400);
  for (const body of [{ id: "one" }, { id: "one", completed: "true" }, { id: "one", text: "" }, { completed: true }]) assert.equal((await f.request("PATCH", "poky", body)).status, 400);
  assert.equal(f.items.length, 1);
  assert.equal(f.items[0].completed, false);
});

test("storage failure returns a retryable error rather than an empty checklist", async () => {
  assert.equal((await fixture(true, true).request("GET")).status, 503);
});

test("storage scopes updates and deletes by both app and item ID", async () => {
  const calls: unknown[] = [];
  const storage = loadTestModule<{
    updateExperiment: (appId: string, id: string, data: object) => Promise<unknown>;
    deleteExperiment: (appId: string, id: string) => Promise<boolean>;
  }>("lib/analytics-experiments.ts", {
    "@/lib/prisma": { prisma: { analyticsExperiment: {
      updateManyAndReturn: async (args: unknown) => { calls.push(args); return []; },
      deleteMany: async (args: unknown) => { calls.push(args); return { count: 0 }; },
    } } },
  });
  assert.equal(await storage.updateExperiment("poky", "foreign-id", { completed: true }), null);
  assert.equal(await storage.deleteExperiment("poky", "foreign-id"), false);
  assert.equal(JSON.stringify(calls), JSON.stringify([
    { where: { id: "foreign-id", appId: "poky" }, data: { completed: true } },
    { where: { id: "foreign-id", appId: "poky" } },
  ]));
});
