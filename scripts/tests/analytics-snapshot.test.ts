import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyticsSnapshotDirectory, completeAnalyticsReport, createAnalyticsSnapshotCache, refreshAnalyticsSnapshots } from "../../lib/analytics-snapshot";

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(tmpdir(), "analytics-snapshots-"));
  const previous = process.env.ANALYTICS_SNAPSHOT_DIR;
  process.env.ANALYTICS_SNAPSHOT_DIR = directory;
  t.after(async () => {
    if (previous === undefined) delete process.env.ANALYTICS_SNAPSHOT_DIR;
    else process.env.ANALYTICS_SNAPSHOT_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, cache: createAnalyticsSnapshotCache() };
}

test("snapshots survive a new cache instance and preserve Dates without fetching", async (t) => {
  const { cache } = await fixture(t);
  const bucket = new Date("2026-10-10T22:00:00Z");
  const first = await cache("glow:day", async () => ({ trend: [{ bucket }], proceeds: null }));
  const restarted = createAnalyticsSnapshotCache();
  const saved = await restarted("glow:day", async () => { throw new Error("Must not contact upstream"); });
  assert.deepEqual(saved, first);
  assert.ok((saved as typeof first).trend[0].bucket instanceof Date);
  assert.equal((saved as typeof first).trend[0].bucket.getTime(), bucket.getTime());
  assert.ok(first.snapshotUpdatedAt);
});

test("refresh replaces saved data, but failed and incomplete refreshes keep it intact", async (t) => {
  const { cache } = await fixture(t);
  await cache("poky:month", async () => ({ users: 5 }));
  await refreshAnalyticsSnapshots(() => cache("poky:month", async () => ({ users: 7 })));
  await assert.rejects(refreshAnalyticsSnapshots(() => cache("poky:month", async () => { throw new Error("API down"); })));
  await assert.rejects(refreshAnalyticsSnapshots(() => cache("poky:month", async () => ({ users: 0, nested: { status: "unavailable" } }))));
  const saved = await createAnalyticsSnapshotCache()("poky:month", async () => ({ users: 0 }));
  assert.equal(saved.users, 7);
});

test("reads return saved data while a forced refresh is running", async (t) => {
  const { cache } = await fixture(t);
  await cache("versy:day", async () => ({ users: 2 }));
  let finish!: (value: { users: number }) => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => { started = resolve; });
  const refreshing = refreshAnalyticsSnapshots(() => cache("versy:day", () => {
    started();
    return new Promise<{ users: number }>((resolve) => { finish = resolve; });
  }));
  await began;
  assert.equal((await cache("versy:day", async () => ({ users: 99 }))).users, 2);
  finish({ users: 3 });
  await refreshing;
  assert.equal((await cache("versy:day", async () => ({ users: 99 }))).users, 3);
});

test("concurrent cold reads share one load and incomplete reports are not persisted", async (t) => {
  const { directory, cache } = await fixture(t);
  let calls = 0;
  const load = async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 20)); return { users: 1 }; };
  await Promise.all([cache("same", load), cache("same", load)]);
  assert.equal(calls, 1);
  await cache("broken", async () => ({ cohortDataAvailable: false }));
  assert.equal((await readdir(path.join(directory, "v10"))).length, 1);
});

test("empty valid reports are cached, and app/period keys stay isolated", async (t) => {
  const { cache } = await fixture(t);
  await cache("glow:day", async () => ({ status: "empty", users: 0 }));
  await cache("glow:month", async () => ({ users: 30 }));
  await cache("poky:day", async () => ({ users: 8 }));
  const restarted = createAnalyticsSnapshotCache();
  assert.equal((await restarted("glow:day", async () => ({ users: 100 }))).users, 0);
  assert.equal((await restarted("glow:month", async () => ({ users: 100 }))).users, 30);
  assert.equal((await restarted("poky:day", async () => ({ users: 100 }))).users, 8);
  assert.equal(completeAnalyticsReport({ subreport: { status: "truncated" } }), false);
});

test("corrupt snapshots recover, and storage failures do not discard live data", async (t) => {
  const { directory, cache } = await fixture(t);
  await cache("old", async () => ({ users: 1 }));
  const [file] = await readdir(path.join(directory, "v10"));
  await writeFile(path.join(directory, "v10", file), "not json");
  assert.equal((await createAnalyticsSnapshotCache()("old", async () => ({ users: 2 }))).users, 2);
  process.env.ANALYTICS_SNAPSHOT_DIR = path.join(directory, "not-a-directory");
  await writeFile(process.env.ANALYTICS_SNAPSHOT_DIR, "file");
  assert.equal((await createAnalyticsSnapshotCache()("new", async () => ({ users: 4 }))).users, 4);
  await assert.rejects(refreshAnalyticsSnapshots(() => createAnalyticsSnapshotCache()("new", async () => ({ users: 4 }))));
});

test("production persistence requires an explicitly configured volume", () => {
  const original = { ...process.env };
  try {
    delete process.env.ANALYTICS_SNAPSHOT_DIR;
    process.env = { ...process.env, NODE_ENV: "production" };
    assert.equal(analyticsSnapshotDirectory(), null);
  } finally { process.env = original; }
});


test("an unavailable statistical estimate does not reject a complete experiment report", async (t) => {
  const { cache } = await fixture(t);
  const report = { status: "ready", estimate: { readiness: {
    status: "unavailable", observed: 3, minimumDetectableEffect: 0.5,
    confidenceLevel: 0.95, power: 0.8, reason: "Waiting for a non-zero control baseline.",
  } } };
  const saved = await refreshAnalyticsSnapshots(() => cache("experiment", async () => report));
  assert.ok(saved.snapshotUpdatedAt);
  assert.equal(completeAnalyticsReport({ ...report, product: { status: "unavailable" } }), false);
});
