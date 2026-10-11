import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { analyticsRefreshJobs, parseAnalyticsRefreshJob } from "../../lib/analytics-refresh-jobs";
import { loadTestModule } from "./helpers/load-test-module";

function fixture(secret: string | undefined = "test-secret", directory: string | null = "/private/cache", fail = false) {
  const calls: string[] = [];
  let refreshing = false;
  const load = (name: string) => async (...args: unknown[]) => {
    assert.equal(refreshing, true);
    calls.push(`${name}:${JSON.stringify(args)}`);
    if (fail) throw new Error("Provider unavailable");
    return { snapshotUpdatedAt: "2026-10-11T12:00:00Z", privateData: "must not appear in response" };
  };
  const route = loadTestModule<{ POST: (request: NextRequest) => Promise<Response> }>("app/api/cron/analytics-refresh/route.ts", {
    "@/lib/analytics-refresh-jobs": { parseAnalyticsRefreshJob },
    "@/lib/analytics-snapshot": {
      analyticsSnapshotDirectory: () => directory,
      refreshAnalyticsSnapshots: async (fn: () => Promise<unknown>) => {
        refreshing = true;
        try { return await fn(); } finally { refreshing = false; }
      },
    },
    "@/lib/mobile-app-analytics": { getMobileAppById: load("mobile") },
    "@/lib/glow-product-queries": { getGlowProductReport: load("glow-product") },
    "@/lib/versy-product-queries": { getVersyProductReport: load("versy-product") },
    "@/lib/winback-paywall-queries": { getWinbackPaywallReport: load("winback") },
    "@/lib/versy-paywall-placement-queries": { getVersyPaywallPlacements: load("placements") },
  }, { CRON_SECRET: secret });
  return { ...route, calls };
}
function request(input: unknown, authorization = "Bearer test-secret") {
  return new NextRequest("https://tap-and-swipe.com/api/cron/analytics-refresh", {
    method: "POST", headers: { authorization, "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
}
const job = { appId: "glow", kind: "data", period: "day" };

test("cron authentication fails closed before any report is loaded", async () => {
  for (const token of ["", "wrong", "Bearer wrong", "Bearer undefined"]) {
    const f = fixture();
    assert.equal((await f.POST(request(job, token))).status, 401);
    assert.equal(f.calls.length, 0);
  }
  const noSecret = fixture("");
  assert.equal((await noSecret.POST(request(job, "Bearer "))).status, 401);
});

test("rejects invalid jobs and an unconfigured persistent volume", async () => {
  const f = fixture();
  for (const input of [{ ...job, appId: "../../secret" }, { ...job, period: "forever" }, { ...job, kind: "experiments" },
    { appId: "poky", kind: "product", period: "month" }, { appId: "glow", kind: "placements", period: "month" }]) {
    assert.equal((await f.POST(request(input))).status, 400);
  }
  assert.equal(f.calls.length, 0);
  assert.equal((await fixture("test-secret", null).POST(request(job))).status, 503);
});

test("all scheduled report variants refresh through the same loaders without returning private data", async () => {
  const f = fixture();
  for (const app of ["glow", "poky", "versy"] as const) {
    for (const job of analyticsRefreshJobs(app)) {
      const response = await f.POST(request(job));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      assert.equal((await response.text()).includes("privateData"), false);
    }
  }
  assert.equal(f.calls.length, 36);
  assert.ok(f.calls.some((call) => call.includes('mobile:["day","glow",{"sessions":false,"includeReports":false}]')));
  assert.ok(f.calls.some((call) => call === 'mobile:["month","poky"]'));
});

test("refresh failures are visible to the scheduler", async () => {
  const response = await fixture("test-secret", "/cache", true).POST(request(job));
  assert.equal(response.status, 502);
  assert.match(await response.text(), /previous snapshot retained/);
});
