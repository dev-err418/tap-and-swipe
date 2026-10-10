import assert from "node:assert/strict";
import test from "node:test";
import { activeTrialsByAge } from "../../lib/active-trials";

const DAY = 86_400_000;
const now = 20 * DAY;
function trial(id: string, age: number, duration = 7) {
  return { originalTransactionId: id, name: "initial_purchase", periodType: "trial",
    isTrialConversion: false, isRefund: false, eventTs: now - age * DAY,
    expiresAt: now + (duration - age) * DAY };
}

test("bins current trials by complete elapsed days and honors actual expiry", () => {
  const events = [trial("new", 0), trial("almost-one", 0.99), trial("one", 1),
    trial("six", 6.99), trial("expired-seven", 7), trial("old-three", 3, 3),
    trial("old-active", 2, 3), trial("extended-seven", 7, 9), trial("extended-eight", 8, 10)];
  const report = activeTrialsByAge(events, 0, now + DAY, now);
  assert.deepEqual(report.days.map((row) => row.active), [2, 1, 1, 0, 0, 0, 1, 1]);
  assert.equal(report.total, 7);
  assert.equal(report.older, 1);
});

test("excludes cancellation, refund and paid conversion even with an unexpired trial", () => {
  const cancelled = trial("cancelled", 2);
  const refunded = trial("refunded", 2);
  const converted = trial("converted", 2);
  const paid = trial("paid", 2);
  const report = activeTrialsByAge([cancelled, refunded, converted, paid,
    { ...cancelled, name: "cancellation", eventTs: now },
    { ...refunded, isRefund: true, eventTs: now },
    { ...converted, name: "renewal", isTrialConversion: true, eventTs: now },
    { ...paid, name: "renewal", periodType: "normal", eventTs: now },
  ], 0, now + DAY, now);
  assert.equal(report.total, 0);
});

test("deduplicates chains, ignores future events, and follows selected starts through now", () => {
  const selected = trial("selected", 2);
  const report = activeTrialsByAge([selected, selected, trial("outside", 4), trial("future", -1),
    { ...selected, name: "cancellation", eventTs: now + DAY },
    trial("end-exclusive", 1), trial("", 2),
  ], now - 3 * DAY, now - DAY, now);
  assert.equal(report.total, 1);
  assert.equal(report.days[2].active, 1);
});

test("missing expiry stays unknown rather than assuming the new seven-day duration", () => {
  const report = activeTrialsByAge([{ ...trial("unknown", 2), expiresAt: NaN }], 0, now + DAY, now);
  assert.equal(report.total, 0);
  assert.equal(report.unknownExpiry, 1);
  assert.equal(activeTrialsByAge([], 0, now, now).days.length, 8);
});
