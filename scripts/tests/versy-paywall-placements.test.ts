import assert from "node:assert/strict";
import test from "node:test";
import { summarizeVersyPlacements } from "../../lib/versy-paywall-placements";

test("lists configured placements and counts distinct viewers with a later purchase", () => {
  const report = summarizeVersyPlacements([
    { userId: "one", placement: "home_crown", reaches: 2, views: 2, attempts: 1, purchases: 1, firstView: 10, lastPurchase: 20 },
    { userId: "two", placement: "home_crown", reaches: 1, views: 1, attempts: 1, purchases: 1, firstView: 20, lastPurchase: 10 },
    { userId: "one", placement: "settings_upgrade", reaches: 1, views: 1, attempts: 0, purchases: 0, firstView: 30, lastPurchase: 0 },
  ], "start", "end");
  assert.equal(report.status, "ready");
  assert.deepEqual(report.rows.find((row) => row.placement === "home_crown"), {
    placement: "home_crown", reached: 2, viewed: 2, attempted: 2, purchased: 1,
  });
  assert.equal(report.rows.find((row) => row.placement === "onboarding_bible_widget_shorter")?.viewed, 0);
  assert.equal(report.rows.find((row) => row.placement === "settings_upgrade")?.viewed, 1);
  assert.equal(report.onboarding.length, 2);
});

test("splits the two onboarding paywalls using saved assignment, including embedded views without a reach event", () => {
  const report = summarizeVersyPlacements([
    { userId: "prayer", placement: "onboarding_short_prayer", onboardingVariant: "short-1-prayer", reaches: 1, views: 1, attempts: 0, purchases: 0, firstView: 10, lastPurchase: 0 },
    { userId: "widget", placement: "onboarding_short_prayer", onboardingVariant: "bible_widget", reaches: 0, views: 1, attempts: 1, purchases: 1, firstView: 10, lastPurchase: 20 },
    { userId: "shorter", placement: "onboarding_short_prayer", onboardingVariant: "bible_widget_shorter", reaches: 0, views: 1, attempts: 1, purchases: 1, firstView: 10, lastPurchase: 20 },
    { userId: "shorter", placement: "onboarding_short_prayer", onboardingVariant: "bible_widget_shorter", reaches: 0, views: 1, attempts: 1, purchases: 1, firstView: 10, lastPurchase: 20 },
  ], "start", "end");
  assert.equal(report.rows.find((row) => row.placement === "onboarding_short_prayer")?.viewed, 1);
  assert.deepEqual(report.rows.find((row) => row.placement === "onboarding_bible_widget"), {
    placement: "onboarding_bible_widget", reached: 1, viewed: 1, attempted: 1, purchased: 1,
  });
  assert.equal(report.onboarding.some((row) => row.placement === "Prayer journey onboarding"), false);
  assert.deepEqual(report.rows.find((row) => row.placement === "onboarding_bible_widget_shorter"), {
    placement: "onboarding_bible_widget_shorter", reached: 1, viewed: 1, attempted: 1, purchased: 1,
  });
  assert.equal(report.onboarding.find((row) => row.placement === "Bible Widget Shorter onboarding")?.viewed, 1);
  assert.equal(report.onboarding.find((row) => row.placement === "Bible Widget onboarding")?.viewed, 1);
});
