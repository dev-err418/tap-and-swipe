import assert from "node:assert/strict";
import test from "node:test";
import { paidExperienceCohort } from "../../lib/paid-experience-cohort";

test("only actual payers enter every experience metric; refunds and inactive payers remain in the cohort", () => {
  const users = ["free", "trial", "paid", "renewed", "outside", "future", "unknown"];
  const event = (appUserId: string, name: string, netProceeds: number | null, eventTs = 150) => ({ appUserId, name, netProceeds, eventTs });
  const facts = {
    startMs: 100, endMs: 200,
    installs: users.map((appUserId) => ({ appUserId, installedAt: appUserId === "outside" ? 90 : 110 })),
    sessions: users.map((appUserId) => ({ appUserId, sessions: 10 })),
    events: [event("trial", "initial_purchase", 0), event("paid", "initial_purchase", 10),
      event("paid", "cancellation", -10), event("renewed", "initial_purchase", 0),
      event("renewed", "renewal", 20), event("outside", "initial_purchase", 30),
      event("future", "initial_purchase", 10, 500), event("unknown", "initial_purchase", null)],
  };
  const selected = paidExperienceCohort(facts, 300);
  assert.deepEqual(selected.installs.map((row) => row.appUserId), ["paid", "renewed"]);
  assert.deepEqual(selected.sessions.map((row) => row.appUserId), ["paid", "renewed"]);
  assert.equal(selected.events.length, 4);
  assert.equal(selected.events.reduce((total, row) => total + (row.netProceeds ?? 0), 0), 20);
  assert.equal(facts.installs.length, 7);
});
