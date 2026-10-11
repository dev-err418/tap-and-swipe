import assert from "node:assert/strict";
import test from "node:test";
import worker from "../../cloudflare/analytics-refresh/worker";

test("Worker refreshes each Poky job without following redirects or forwarding credentials", async (t) => {
  const requests: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    requests.push(init);
    assert.equal(init.redirect, "manual");
    return new Response("{}", { status: requests.length === 1 ? 302 : 200 });
  });
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  await assert.rejects(worker.scheduled({ cron: "10,40 * * * *" }, {
    ANALYTICS_ORIGIN: "https://example.com", CRON_SECRET: "test-only",
  }), /experiments:month/);
  assert.equal(requests.length, 7);
  assert.equal(new Set(requests.map((r) => r.body)).size, 7);
});
