import assert from "node:assert/strict";
import test from "node:test";
import { isMobileMoneyEvent } from "../../lib/mobile-app-money";

test("purchase events and cancellation-shaped refunds affect mobile proceeds", () => {
  assert.equal(isMobileMoneyEvent({ name: "initial_purchase", netProceeds: 8.5 }), true);
  assert.equal(isMobileMoneyEvent({ name: "renewal", netProceeds: 8.5 }), true);
  assert.equal(isMobileMoneyEvent({ name: "non_renewing_purchase", netProceeds: 8.5 }), true);
  assert.equal(isMobileMoneyEvent({ name: "cancellation", netProceeds: -8.5 }), true);
});

test("ordinary cancellations do not affect mobile proceeds", () => {
  assert.equal(isMobileMoneyEvent({ name: "cancellation", netProceeds: null }), false);
  assert.equal(isMobileMoneyEvent({ name: "cancellation", netProceeds: 0 }), false);
  assert.equal(isMobileMoneyEvent({ name: "cancellation", netProceeds: 8.5 }), false);
});
