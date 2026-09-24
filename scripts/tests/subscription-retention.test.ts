import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionActiveAt } from "../../lib/subscription-retention";

const DAY = 86_400_000;

test("a cancellation ends subscription retention even when the old expiry is later", () => {
  const events = [
    { name: "initial_purchase", isRefund: false, eventTs: 0, expiresAt: 10 * DAY },
    { name: "cancellation", isRefund: false, eventTs: 3 * DAY, expiresAt: 10 * DAY },
    { name: "renewal", isRefund: false, eventTs: 12 * DAY, expiresAt: 20 * DAY },
  ];
  assert.equal(subscriptionActiveAt(events, 2 * DAY), true);
  assert.equal(subscriptionActiveAt(events, 7 * DAY), false);
  assert.equal(subscriptionActiveAt(events, 14 * DAY), true);
  assert.equal(subscriptionActiveAt(events, 20 * DAY), false);
});

test("refund ends the paid term at the refund timestamp", () => {
  const events = [
    { name: "initial_purchase", isRefund: false, eventTs: 0, expiresAt: 10 * DAY },
    { name: "cancellation", isRefund: true, eventTs: 5 * DAY, expiresAt: 10 * DAY },
  ];
  assert.equal(subscriptionActiveAt(events, 4 * DAY), true);
  assert.equal(subscriptionActiveAt(events, 7 * DAY), false);
});
