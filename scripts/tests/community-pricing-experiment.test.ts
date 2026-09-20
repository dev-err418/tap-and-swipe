import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMUNITY_PRICING_URLS,
  assembleCommunityPricingExperiment,
  chooseCommunityPricingVariant,
  communityEuroTierForPlan,
  communityPricingMarker,
  communityPricingVariantForPlan,
  communityPricingVariantFromMarker,
} from "../../lib/community-pricing-experiment";

test("community pricing assignment is a two-way USD/EUR split", () => {
  assert.equal(chooseCommunityPricingVariant(0), "usd");
  assert.equal(chooseCommunityPricingVariant(1), "eur");
  assert.match(COMMUNITY_PRICING_URLS.usd, /app-sprint-access\/$/);
  assert.match(COMMUNITY_PRICING_URLS.eur, /app-sprint-access-eur\/$/);
});

test("current Whop plans map to the correct experiment arm", () => {
  assert.equal(communityPricingVariantForPlan("plan_nYipX56xPU7wG"), "usd");
  assert.equal(communityPricingVariantForPlan("plan_R17LIUVVasTe2"), "usd");
  assert.equal(communityPricingVariantForPlan("plan_TST74YEnFAx5Q"), "eur");
  assert.equal(communityPricingVariantForPlan("plan_aJQtRRtuScfXU"), "eur");
  assert.equal(communityPricingVariantForPlan("plan_unknown"), null);
});

test("EUR plans preserve the original Builder and Founder entitlements", () => {
  assert.equal(communityEuroTierForPlan("plan_TST74YEnFAx5Q"), "starter");
  assert.equal(communityEuroTierForPlan("plan_aJQtRRtuScfXU"), "full");
  assert.equal(communityEuroTierForPlan("plan_unknown"), null);
});

test("experiment markers round-trip without treating normal currencies as assignments", () => {
  assert.equal(communityPricingVariantFromMarker(communityPricingMarker("usd")), "usd");
  assert.equal(communityPricingVariantFromMarker(communityPricingMarker("eur")), "eur");
  assert.equal(communityPricingVariantFromMarker("eur"), null);
  assert.equal(communityPricingVariantFromMarker(null), null);
});

test("dashboard results deduplicate visitors and attribute paid revenue by arm", () => {
  const usd = communityPricingMarker("usd");
  const eur = communityPricingMarker("eur");
  const rows = assembleCommunityPricingExperiment([
    { type: "page_view", visitorId: "usd-visitor", revenue: null, currency: usd },
    { type: "page_view", visitorId: "usd-visitor", revenue: null, currency: usd },
    { type: "paid", visitorId: "usd-visitor", revenue: 9_900, currency: usd },
    { type: "page_view", visitorId: "eur-visitor", revenue: null, currency: eur },
    { type: "paid", visitorId: "eur-visitor", revenue: 14_900, currency: eur },
    { type: "renewal", visitorId: "eur-visitor", revenue: 14_900, currency: eur },
    { type: "paid", visitorId: "old-plan", revenue: 6_700, currency: "eur" },
  ]);

  assert.deepEqual(rows.map(({ variant, visitors, paid, revenue }) => ({ variant, visitors, paid, revenue })), [
    { variant: "usd", visitors: 1, paid: 1, revenue: 99 },
    { variant: "eur", visitors: 1, paid: 1, revenue: 149 },
  ]);
});
