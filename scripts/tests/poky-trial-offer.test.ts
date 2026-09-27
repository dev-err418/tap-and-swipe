import assert from "node:assert/strict";
import test from "node:test";
import { POKY_TRIAL_OFFER_ATTRIBUTE_KEYS, pokyTrialOfferExperiment } from "../../lib/poky-trial-offer";

const DAY = 86_400_000;
const START = Date.parse("2026-09-27T00:00:00Z");
const attributes = (variant: string, assignedAt = START + 1_000, allocation = "50_50", environment = "production") => ({
  onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_variant: variant,
  onboarding_offer_assigned_at: String(assignedAt), onboarding_offer_allocation: allocation,
  onboarding_offer_language: "en",
  poky_tracking_environment: environment,
});
const event = (appUserId: string, originalTransactionId: string, transactionId: string, name: string,
  netProceeds: number, eventTs = START + 2_000, options: { trial?: boolean; refund?: boolean; productId?: string } = {}) => ({
    appUserId, originalTransactionId, transactionId, name, netProceeds, eventTs, attributionTs: eventTs + 1,
    isRefund: options.refund ?? false,
    productId: options.productId ?? (options.trial ? "arthurbuildsstuff.peptides.yearly.trial" : "arthurbuildsstuff.peptides.yearly.5999"),
    periodType: options.trial ? "trial" : "normal",
  });

test("trial and current use only fresh production assignments, including nonviewers", () => {
  assert.equal(POKY_TRIAL_OFFER_ATTRIBUTE_KEYS.length, 5);
  const report = pokyTrialOfferExperiment({
    startMs: START, endMs: START + DAY,
    installs: ["current", "trial", "legacy", "sandbox"].map((appUserId) => ({ appUserId, country: "US", language: "en", installedAt: START - DAY })),
    attributes: new Map([
      ["current", attributes("current")], ["trial", attributes("trial")],
      ["legacy", attributes("current", START + 1_000, "legacy")],
      ["sandbox", attributes("trial", START + 1_000, "50_50", "sandbox")],
    ]),
    events: [],
  }, START + DAY);
  assert.deepEqual(report.variants.map((row) => row.users), [1, 1]);
  assert.deepEqual(report.languageVariants?.en?.map((row) => row.users), [1, 1]);
  assert.equal(report.randomized, true);
});

test("free trial start and later paid renewal count once; historical money is excluded", () => {
  const report = pokyTrialOfferExperiment({
    startMs: START, endMs: START + DAY,
    installs: ["trial", "current", "nonpayer"].map((appUserId) => ({ appUserId, country: "US", language: "en", installedAt: START - DAY })),
    attributes: new Map([
      ["trial", attributes("trial")], ["current", attributes("current")], ["nonpayer", attributes("trial")],
    ]),
    events: [
      event("trial", "old", "old", "initial_purchase", 60, START - DAY),
      event("trial", "old", "old-renewal", "renewal", 30, START + 4 * DAY),
      event("trial", "fresh", "fresh", "initial_purchase", 0, START + 2_000, { trial: true }),
      event("trial", "fresh", "renewal", "renewal", 40, START + 4 * DAY),
      event("trial", "fresh", "renewal", "renewal", 40, START + 4 * DAY),
      event("trial", "fresh", "refund", "cancellation", -5, START + 5 * DAY, { refund: true }),
      event("current", "paid", "paid", "initial_purchase", 30),
    ],
  }, START + 6 * DAY);
  assert.deepEqual(report.variants.map((row) => row.users), [1, 2]);
  assert.deepEqual(report.variants.map((row) => row.trials), [0, 1]);
  assert.deepEqual(report.variants.map((row) => row.converted), [0, 1]);
  assert.deepEqual(report.variants.map((row) => row.paid), [1, 1]);
  assert.deepEqual(report.variants.map((row) => row.proceeds), [30, 35]);
  assert.equal(report.variants[1].proceedsVariance, 612.5);
});

test("assignment date selects the cohort while eligible revenue follows through today", () => {
  const report = pokyTrialOfferExperiment({
    startMs: START, endMs: START + DAY,
    installs: ["in", "out"].map((appUserId) => ({ appUserId, country: "US", language: "fr", installedAt: START - DAY })),
    attributes: new Map([["in", { ...attributes("trial"), onboarding_offer_language: "fr" }], ["out", attributes("trial", START + 2 * DAY)]]),
    events: [
      event("in", "in", "in", "initial_purchase", 0, START + 2_000, { trial: true }),
      event("in", "in", "renewed", "renewal", 20, START + 4 * DAY),
      event("out", "out", "out", "initial_purchase", 100, START + 3 * DAY),
    ],
  }, START + 6 * DAY);
  assert.equal(report.variants[1].users, 1);
  assert.equal(report.variants[1].proceeds, 20);
  assert.equal(report.languageVariants?.fr?.[1].proceeds, 20);
});
