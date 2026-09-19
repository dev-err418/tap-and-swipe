import assert from "node:assert/strict";
import test from "node:test";
import { pokyNativeRecoveryExperiment } from "../../lib/poky-native-recovery";
import type { PaywallAttribute } from "../../lib/native-paywall-analytics";
const DAY = 86400000;
const start = Date.parse("2026-09-01T00:00:00Z");
const assignment = (appUserId: string, variant: string, language = "en", at = start, environment = "production"): PaywallAttribute => ({ appUserId, key: `gp1_a_poky_native_recovery_v1_${language}`, value: JSON.stringify({ schema: 1, environment, experiment: `poky_native_recovery_v1_${language}`, experimentName: "Recovery", variant, variantName: variant, paywall: variant, language, assignedAt: at, randomized: true, variantCount: 2, expectedProduct: "recovery" }) });
const event = (appUserId: string, amount: number, day: number, tx = appUserId, name = "initial_purchase") => ({ appUserId, netProceeds: amount, eventTs: start + day * DAY, name, originalTransactionId: appUserId, transactionId: tx, attributionTs: start + day * DAY });

test("native recovery includes non-viewers and later main-paywall purchases in holdout, without duplicating revenue", () => {
  const result = pokyNativeRecoveryExperiment([assignment("a", "holdout"), assignment("b", "recovery"), assignment("c", "holdout")], [event("a", 50, 2), event("a", 50, 2), event("b", 20, 3), event("b", -20, 4, "b", "cancellation"), event("a", 10, 8, "renewal", "renewal")], new Map([["a", "US"]]), start, start + DAY, start + 10 * DAY);
  const [none, offer] = result.variants;
  assert.equal(none.users, 2);
  assert.equal(none.paid, 1);
  assert.equal(none.proceeds, 60);
  assert.equal(none.proceedsD7, 50);
  assert.equal(none.installsD7, 2);
  assert.equal(none.installsD14, 0);
  assert.equal(none.proceedsD14, 0);
  assert.equal(offer.proceeds, 0);
  assert.equal(offer.paid, 1);
  assert.equal(none.countries.US.proceeds, 60);
});

test("first eligibility is sticky across languages; sandbox, future and pre-assignment outcomes are excluded", () => {
  const attrs = [assignment("a", "holdout", "en", start - DAY), assignment("a", "recovery", "fr"), assignment("dev", "recovery", "en", start, "development"), assignment("b", "recovery"), assignment("future", "recovery", "en", start + 20 * DAY)];
  const result = pokyNativeRecoveryExperiment(attrs, [event("a", 50, 2), event("dev", 50, 2), event("b", 20, -1), event("b", 20, 20)], new Map(), start, start + DAY, start + 10 * DAY);
  assert.equal(result.variants[0].users, 0);
  assert.equal(result.variants[1].users, 1);
  assert.equal(result.variants[1].proceeds, 0);
});

test("ordinary subscription cancellation is not a refund", () => {
  const result = pokyNativeRecoveryExperiment([assignment("a", "holdout")], [event("a", 50, 2), event("a", 50, 3, "a", "cancellation")], new Map(), start, start + DAY, start + 10 * DAY);
  assert.equal(result.variants[0].proceeds, 50);
});
