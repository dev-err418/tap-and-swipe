import assert from "node:assert/strict";
import test from "node:test";
import { POKY_TRIAL_OFFER_ATTRIBUTE_KEYS, pokyTrialOfferExperiment } from "../../lib/poky-trial-offer";

const DAY = 86_400_000;
const START = Date.parse("2026-09-27T00:00:00Z");
const attributes = (variant: string, assignedAt = START + 1_000, allocation = "50_50_trials_equal", environment = "production") => ({
  onboarding_offer_experiment: "poky_onboarding_trial_v4", onboarding_offer_variant: variant,
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
  assert.ok(POKY_TRIAL_OFFER_ATTRIBUTE_KEYS.includes("poky_us_hp_override_seen"));
  const report = pokyTrialOfferExperiment({
    startMs: START, endMs: START + DAY,
    installs: ["current", "trial", "legacy", "sandbox"].map((appUserId) => ({ appUserId, country: "US", language: "en", installedAt: START - DAY })),
    attributes: new Map([
      ["current", attributes("current")], ["trial", attributes("trial")],
      ["legacy", attributes("current", START + 1_000, "legacy")],
      ["sandbox", attributes("trial", START + 1_000, "50_50_trials_equal", "sandbox")],
    ]),
    events: [],
  }, START + DAY);
  assert.deepEqual(report.variants.map((row) => row.users), [1, 1, 0, 0]);
  assert.deepEqual(report.languageVariants?.en?.map((row) => row.users), [1, 1, 0, 0]);
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
  assert.deepEqual(report.variants.map((row) => row.users), [1, 2, 0, 0]);
  assert.deepEqual(report.variants.map((row) => row.trials), [0, 1, 0, 0]);
  assert.deepEqual(report.variants.map((row) => row.converted), [0, 1, 0, 0]);
  assert.deepEqual(report.variants.map((row) => row.paid), [1, 1, 0, 0]);
  assert.deepEqual(report.variants.map((row) => row.proceeds), [30, 35, 0, 0]);
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

test("seven-day assignments use the new product alongside matching historical 50/50 flows", () => {
  const facts = { startMs: START, endMs: START + DAY,
    installs: ["seven", "free", "old"].map((appUserId) => ({ appUserId, country: "FR", installedAt: START })),
    attributes: new Map([
      ["seven", attributes("trial_7d")], ["free", attributes("trial_7d")],
      ["old", { ...attributes("trial", START + 1000, "50_50"), onboarding_offer_experiment: "poky_onboarding_trial_v1" }],
    ]),
    events: [event("seven", "seven", "start", "initial_purchase", 0, START + 2000,
      { trial: true, productId: "arthurbuildsstuff.peptides.yearly.trial7" }),
      event("seven", "seven", "paid", "renewal", 30, START + 8 * DAY),
      event("seven", "seven", "refund", "cancellation", -5, START + 9 * DAY, { refund: true })],
  };
  const report = pokyTrialOfferExperiment(facts, START + 10 * DAY);
  assert.deepEqual(report.variants.map((row) => row.users), [0, 1, 2, 0]);
  assert.equal(report.variants[2].trials, 1);
  assert.equal(report.variants[2].converted, 1);
  assert.equal(report.variants[2].proceeds / report.variants[2].users, 12.5);
});


test("forced US hard-paywall users never enter randomized offer results", () => {
  const report = pokyTrialOfferExperiment({
    startMs: START, endMs: START + DAY, installs: [], events: [],
    attributes: new Map<string, Record<string, string>>([
      ["forced", { ...attributes("trial_7d"), poky_us_hp_override_seen: "true" }],
      ["normal", attributes("trial_7d")],
    ]),
  }, START + DAY);
  assert.deepEqual(report.variants.map((row) => row.users), [0, 0, 1, 0]);
});


test("same-product seven-day designs stay separate while v2 joins the matching presentation", () => {
  const facts = { startMs: START, endMs: START + DAY, installs: [],
    attributes: new Map([
      ["text", attributes("trial_7d")], ["mascot", attributes("trial_7d_mascot")], ["free", attributes("trial_7d_mascot")],
      ["old", { ...attributes("trial_7d", START + 1000, "25_25_50"), onboarding_offer_experiment: "poky_onboarding_trial_v2" }],
    ]),
    events: [event("text", "text", "paid-text", "initial_purchase", 10, START + 2000, { productId: "arthurbuildsstuff.peptides.yearly.trial7" }),
      event("mascot", "mascot", "paid-mascot", "initial_purchase", 30, START + 2000, { productId: "arthurbuildsstuff.peptides.yearly.trial7" }),
      event("mascot", "mascot", "paid-mascot", "cancellation", -5, START + 3000, { refund: true })],
  };
  const report = pokyTrialOfferExperiment(facts, START + DAY);
  assert.deepEqual(report.variants.map((row) => row.users), [0, 0, 2, 2]);
  assert.equal(report.variants[2].proceeds, 10);
  assert.equal(report.variants[3].proceeds / report.variants[3].users, 12.5);
  assert.equal(report.id, "poky-trial-vs-current");
  assert.doesNotMatch(report.title, /Previous/);
});
