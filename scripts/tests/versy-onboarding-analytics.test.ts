import assert from "node:assert/strict";
import test from "node:test";
import { versyOnboardingAudience, versyOnboardingPaywallReached } from "../../lib/versy-onboarding-analytics";
import { userJourneyDefinition, buildUserJourney, ASSIGNED_KEY } from "../../lib/user-journey";
import { userJourneySql } from "../../lib/user-journey-queries";
import { appExperimentFlow } from "../../lib/app-experiment-flow";

test("Mexico and uncertain geography cannot enter the comparison", () => {
  assert.equal(versyOnboardingAudience("US", { country: "us" }), "comparison");
  assert.equal(versyOnboardingAudience("MX", { country: "US" }), "mexico");
  assert.equal(versyOnboardingAudience("US", { country: " mx " }), "mexico");
  for (const [install, reported] of [["unknown", "US"], ["US", "XX"], ["US", "FR"], ["US", ""], ["XX", "XX"]]) {
    assert.equal(versyOnboardingAudience(install, { country: reported }), "unknown");
  }
});

test("each flow measures its own final paywall screen", () => {
  assert.equal(versyOnboardingPaywallReached({ onboarding_variant: "scroll_the_bible", widget_screen_seen: "true" }), false);
  assert.equal(versyOnboardingPaywallReached({ onboarding_variant: "scroll_the_bible", scroll_bible_trial_screen_seen: "1" }), true);
  assert.equal(versyOnboardingPaywallReached({ onboarding_variant: "bible_widget", bible_widget_paywall_screen_seen: "true" }), true);
  assert.equal(versyOnboardingPaywallReached({ onboarding_variant: "bible_widget_shorter", scroll_bible_trial_screen_seen: "true" }), false);
});

test("current funnel uses the 15 current screens and explicit production enrollment", () => {
  const definition = userJourneyDefinition("versy")!;
  const scroll = definition.variants.find((row) => row.key === "scroll_the_bible")!;
  assert.deepEqual(scroll.steps.map((step) => step.attribute), ["welcome", "scrollingHours", "fedYourSoul", "closeness", "familiarity", "goal", "obstacle", "reassurance", "verseStory", "readingHabit", "notifications", "reviews", "goDeeper", "remindPromise", "trial"].map((key) => `versy_journey_scroll_bible_${key}_screen_seen`));
  const sql = userJourneySql(51393, definition, "2026-10-01 00:00:00", "2026-10-08 00:00:00");
  assert.match(sql, /versy_onboarding_journey_schema/);
  assert.match(sql, /value = 'production'/);
  assert.doesNotMatch(sql, /bible_widget_shorter_v1/);
  const report = buildUserJourney(definition, [
    { variant: "scroll_the_bible", key: ASSIGNED_KEY, users: 10 },
    { variant: "scroll_the_bible", key: "versy_journey_scroll_bible_trial_screen_seen", users: 4 },
  ]);
  assert.equal(report.variants.find((row) => row.key === "scroll_the_bible")?.completionShare, 0.4);
});

test("Bible Scroll bypasses the widget soft/hard paywall nodes", () => {
  const flow = appExperimentFlow("versy")!;
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "scroll_the_bible").map((edge) => edge.to), ["scroll-trial"]);
  assert.equal(flow.edges.filter((edge) => edge.from === "scroll-trial").length, 3);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "start").map((edge) => edge.label), ["10%", "10%", "80%"]);
  assert.deepEqual(flow.nodes.filter((node) => node.experimentId === "versy-yearly-price-v1").map((node) => node.variantId), ["yearly_3999_80", "yearly_2999_80", "yearly_4999_80"]);
  assert.ok(flow.nodes.every((node) => node.y < flow.height));
});
