import assert from "node:assert/strict";
import test from "node:test";
import { activeWebsiteABTestCount } from "../../lib/website-ab-tests";

test("website A/B badge includes six page CTA comparisons alongside pricing", () => {
  const ctaExperiment = Array.from({ length: 6 }, (_, index) => ["control", "benefit"].map((variant) => ({ experiment: "seo_cta_message_2026_10_v3", page: `/page-${index}`, placement: "result", variant }))).flat();
  assert.equal(activeWebsiteABTestCount({ ctaExperiment, pricingExperiment: [{ variant: "a" }, { variant: "b" }] }), 7);
  assert.equal(activeWebsiteABTestCount({ ctaExperiment: [...ctaExperiment, ...ctaExperiment] }), 6);
});

test("missing CTA data and single-variant groups do not invent another A/B test", () => {
  assert.equal(activeWebsiteABTestCount({}), 0);
  assert.equal(activeWebsiteABTestCount({ ctaExperiment: [{ experiment: "test", page: "/page", placement: "result", variant: "control" }] }), 0);
});
