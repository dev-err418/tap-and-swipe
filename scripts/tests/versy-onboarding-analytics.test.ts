import assert from "node:assert/strict";
import test from "node:test";
import { versyOnboardingAudience, versyOnboardingPaywallReached } from "../../lib/versy-onboarding-analytics";
import { userJourneyDefinition, buildUserJourney, journeyDrops, largestDropAttributes, ASSIGNED_KEY } from "../../lib/user-journey";
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

test("current funnel includes the optional benefits branch and explicit production enrollment", () => {
  const definition = userJourneyDefinition("versy")!;
  const scroll = definition.variants.find((row) => row.key === "scroll_the_bible")!;
  assert.deepEqual(scroll.steps.map((step) => step.attribute), ["welcome", "scrollingHours", "fedYourSoul", "closeness", "familiarity", "goal", "obstacle", "reassurance", "verseStory", "readingHabit", "notifications", "reviews", "teamNote", "goDeeper", "benefits", "remindPromise", "trial"].map((key) => `versy_journey_scroll_bible_${key}_screen_seen`));
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

test("both note variants keep their route-specific paywall", () => {
  const flow = appExperimentFlow("versy")!;
  for (const route of ["scroll_the_bible", "bible_widget", "bible_widget_shorter"]) {
    assert.deepEqual(flow.edges.filter((edge) => edge.from === route).map((edge) => edge.to), ["reviews"]);
  }
  for (const id of ["note-control", "note-note"]) {
    assert.equal(flow.edges.find((edge) => edge.from === id && edge.to === "scroll-trial")?.label, "Scroll");
    assert.deepEqual(flow.edges.filter((edge) => edge.from === id && edge.to.startsWith("access-")).map((edge) => edge.label), ["Widget · 100%"]);
  }
  assert.equal(flow.edges.filter((edge) => edge.from === "scroll-trial").length, 1);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "start").map((edge) => edge.label), ["33.33%", "33.33%", "33.33%"]);
  assert.deepEqual(flow.nodes.filter((node) => node.id.startsWith("price-")).map((node) => node.label), ["$49.99/year (7d)"]);
  assert.equal(flow.nodes.find((node) => node.id === "scroll-trial")?.detail, "Dismissible · yearly + weekly");
  assert.ok(!flow.nodes.some((node) => node.id === "access-dismissible"));
  assert.ok(flow.nodes.filter((node) => /^(price-|access-)/.test(node.id)).every((node) => !node.experimentId));
  assert.ok(flow.nodes.every((node) => node.y < flow.height));
});

// The control cohort skips benefits; this must not reset the main-path baseline.
test("optional benefits visits do not create a false reminder drop-off", () => {
  const definition = userJourneyDefinition("versy")!;
  const steps = definition.variants.find((row) => row.key === "scroll_the_bible")!.steps;
  const report = buildUserJourney(definition, [
    { variant: "scroll_the_bible", key: ASSIGNED_KEY, users: 100 },
    ...steps.map((step) => ({ variant: "scroll_the_bible", key: step.attribute,
      users: step.attribute.includes("benefits") ? 45 : step.attribute.includes("remindPromise") || step.attribute.includes("trial") ? 80 : 90 })),
  ]);
  const scroll = report.variants.find((row) => row.key === "scroll_the_bible")!;
  const drops = journeyDrops(scroll.steps, scroll.assigned);
  const benefits = drops.find((row) => row.attribute.includes("benefits"))!;
  assert.equal(benefits.branch, true);
  assert.equal(drops.find((row) => row.attribute.includes("remindPromise"))?.lost, 10);
  assert.ok(!largestDropAttributes(drops).includes(benefits.attribute));
});


test("the optional note never replaces the main journey drop-off baseline", () => {
  const definition = userJourneyDefinition("versy")!;
  for (const route of definition.variants) {
    const reviews = route.steps.findIndex((step) => step.attribute.includes("reviews"));
    assert.ok(route.steps[reviews + 1].attribute.includes("teamNote"));
    assert.equal(route.steps[reviews + 1].branch, true);
    const result = buildUserJourney(definition, [
      { variant: route.key, key: ASSIGNED_KEY, users: 100 },
      ...route.steps.map((step) => ({ variant: route.key, key: step.attribute,
        users: step.attribute.includes("teamNote") ? 64 : 80 })),
    ]);
    const drops = journeyDrops(result.variants.find((row) => row.key === route.key)!.steps, 100);
    assert.equal(drops[reviews + 2].lost, 0);
  }
});
