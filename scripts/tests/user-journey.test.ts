import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import UserJourneyFunnel from "../../components/analytics/UserJourneyFunnel";
import { ASSIGNED_KEY, buildUserJourney, journeyDrops, largestDropAttributes, userJourneyDefinition, type UserJourneyDefinition } from "../../lib/user-journey";
import { loadUserJourney, userJourneySql } from "../../lib/user-journey-queries";

test("glow and versy journeys follow each onboarding variant", () => {
  const glow = userJourneyDefinition("glow")!;
  assert.deepEqual(glow.variants.map((variant) => variant.key), ["iam", "copy"]);
  assert.equal(glow.variants[0].steps.length, 45);
  assert.equal(glow.variants[0].steps[0].attribute, "welcome_screen_seen");
  assert.equal(glow.variants[0].steps.at(-1)?.attribute, "paywall_seen");
  assert.equal(glow.variants[0].steps.at(-1)?.attributeSuffix, "__onboarding_iam_complete");
  assert.equal(glow.variants[1].steps.at(-1)?.attributeSuffix, "__onboarding_complete_copy");
  assert.equal(glow.variants[0].steps.some((step) => step.attribute.includes("notification")), true);
  assert.equal(glow.variants[0].steps.some((step) => step.attribute.startsWith("source")), false);

  const versy = userJourneyDefinition("versy")!;
  assert.deepEqual(versy.variants.map((variant) => variant.key), ["bible_widget", "bible_widget_shorter", "scroll_the_bible"]);
  const [widget, shorter] = versy.variants;
  assert.equal(widget.steps[0].attribute, "versy_journey_bible_widget_entry_screen_seen");
  assert.equal(widget.steps.find((step) => step.paywall)?.attribute, "versy_journey_bible_widget_paywall_screen_seen");
  assert.equal(widget.steps.at(-1)?.branch, true);
  assert.equal(versy.variantAttribute, "versy_onboarding_journey_variant");
  assert.deepEqual(versy.cohortAttributes, { versy_onboarding_journey_schema: "2", versy_tracking_environment: "production" });
  assert.equal(shorter.steps.length, widget.steps.length - 2);
  assert.deepEqual(widget.steps.filter((step) => !shorter.steps.some((other) => other.attribute === step.attribute)).map((step) => step.attribute), [
    "versy_journey_bible_widget_habit_screen_seen", "versy_journey_bible_widget_relationshipWithGod_screen_seen",
  ]);
  assert.equal(shorter.steps.find((step) => step.branch)?.attribute, "versy_journey_bible_widget_notificationsDenied_screen_seen");
  assert.equal(shorter.steps.at(-1)?.branch, true);
  assert.equal(shorter.steps.at(-1)?.attribute, "versy_journey_bible_widget_recovery_screen_seen");
  const sql = userJourneySql(123, versy, "2026-10-06 00:00:00.000", "2026-10-07 00:00:00.000");
  assert.match(sql, /versy_onboarding_journey_schema/);
  assert.match(sql, /versy_tracking_environment/);
  assert.doesNotMatch(sql, /short-1-prayer/);
});

test("Poky journeys match the four sticky intro and plan combinations", () => {
  const poky = userJourneyDefinition("poky")!;
  assert.equal(poky.variantAttribute, "onboarding_variant");
  assert.deepEqual(poky.variants.map((variant) => variant.key), ["control_plan_a", "control_plan_b", "animated_plan_a", "animated_plan_b"]);
  for (const variant of poky.variants) {
    assert.equal(variant.steps[0].attribute, "welcome_screen_seen");
    assert.equal(variant.steps.at(-1)?.attribute, "onboarding_paywall_screen_seen");
    assert.equal(variant.steps.at(-1)?.paywall, true);
    assert.equal(variant.steps.at(-2)?.label, variant.key.endsWith("_a") ? "Plan A" : "Plan B");
    assert.equal(variant.steps.some((step) => step.attribute === "animated_plan_intro_screen_seen"), variant.key.startsWith("animated_"));
    assert.equal(variant.steps.length, variant.key.startsWith("animated_") ? 26 : 25);
    assert.equal(new Set(variant.steps.map((step) => step.attribute)).size, variant.steps.length);
    assert.equal(variant.steps.some((step) => step.attributeKey || step.attributeSuffix), false);
  }
  assert.deepEqual(poky.cohortAttributes, { poky_onboarding_journey_schema: "1", poky_tracking_environment: "production" });
});

test("Poky SQL requires production enrollment and keeps views separate from requests", () => {
  const sql = userJourneySql(49771, userJourneyDefinition("poky")!, "2026-10-01 00:00:00.000", "2026-10-04 00:00:00.000");
  assert.match(sql, /applicationId = 49771/);
  assert.match(sql, /countIf\(key = 'poky_tracking_environment' AND value = 'production'\) > 0/);
  assert.match(sql, /countIf\(key = 'poky_onboarding_journey_schema' AND value = '1'\) > 0/);
  assert.match(sql, /onboarding_paywall_screen_seen/);
  assert.match(sql, /appInstallDate >=/);
  assert.doesNotMatch(sql, /gp1_p_|paywall_placement|firstName|profileCurrentWeightLb/);
});

test("Poky reports all assigned users and actual paywall views in each variant", async () => {
  const report = await loadUserJourney(async <T,>() => [
    { variant: "control_plan_b", key: ASSIGNED_KEY, users: "100" },
    { variant: "control_plan_b", key: "welcome_screen_seen", users: "100" },
    { variant: "control_plan_b", key: "custom_plan_screen_seen", users: "50" },
    { variant: "control_plan_b", key: "onboarding_paywall_screen_seen", users: "40" },
    { variant: "animated_plan_a", key: ASSIGNED_KEY, users: "80" },
    { variant: "animated_plan_a", key: "welcome_screen_seen", users: "80" },
    { variant: "animated_plan_a", key: "onboarding_paywall_screen_seen", users: "20" },
  ] as T[], "poky", 49771, "2026-10-01 00:00:00.000", "2026-10-04 00:00:00.000");
  assert.equal(report.status, "ready");
  assert.deepEqual(report.variants.map((variant) => variant.completionShare), [0.4, 0.25]);
  const html = renderToStaticMarkup(createElement(UserJourneyFunnel, { report, windowLabel: "Last 7 days" }));
  assert.match(html, /No intro · Plan B/);
  assert.match(html, /Animated intro · Plan A/);
  assert.match(html, /Earlier journeys cannot be reconstructed/);
  assert.match(html, /\(40%\)/);
});

test("Poky empty and failed queries remain explicit", async () => {
  const empty = buildUserJourney(userJourneyDefinition("poky")!, []);
  assert.equal(empty.status, "empty");
  assert.match(empty.note!, /updated Poky app/);
  const failed = await loadUserJourney(async () => { throw new Error("Query failed"); }, "poky", 49771, "2026-10-01 00:00:00.000", "2026-10-04 00:00:00.000");
  assert.equal(failed.status, "unavailable");
  assert.equal(failed.variants.length, 0);
});

test("screen reach is a share of assigned installs in that variant", () => {
  const definition = userJourneyDefinition("glow")!;
  const report = buildUserJourney(definition, [
    { variant: "copy", key: ASSIGNED_KEY, users: 100 },
    { variant: "copy", key: "welcome_screen_seen", users: 100 },
    { variant: "copy", key: "widget_screen_seen", users: 40 },
    { variant: "copy", key: "trial_reminder_screen_seen", users: 70 },
    { variant: "iam", key: ASSIGNED_KEY, users: 0 },
    { variant: "other", key: ASSIGNED_KEY, users: 9 },
  ]);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.variants.map((variant) => variant.key), ["copy"]);
  const copy = report.variants[0];
  assert.equal(copy.assigned, 100);
  assert.equal(copy.steps[0].share, 1);
  assert.equal(copy.steps.find((step) => step.attribute === "widget_screen_seen")?.share, 0.4);
  assert.equal(copy.steps.find((step) => step.attribute === "trial_reminder_screen_seen")?.users, 70);
  assert.equal(copy.steps.find((step) => step.attribute === "age_screen_seen")?.users, 0);
  assert.equal(copy.completionShare, 0);

  const html = renderToStaticMarkup(createElement(UserJourneyFunnel, { report, windowLabel: "Last 7 days" }));
  assert.match(html, /User journey/);
  assert.match(html, /Copy/);
  assert.match(html, /\(0%\)/);
  assert.match(html, /100/);
  assert.match(html, /Widget/);
  assert.doesNotMatch(html, /IAM/);
});

test("completion is paywall reach, and the three steepest main-path drops are marked", () => {
  const definition: UserJourneyDefinition = {
    title: "User journey",
    variantAttribute: "onboarding_variant",
    variants: [{
      key: "iam",
      label: "IAM",
      steps: [
        { attribute: "a", label: "A" },
        { attribute: "b", label: "B" },
        { attribute: "c", label: "C", branch: true },
        { attribute: "paywall_seen", label: "Paywall", paywall: true },
      ],
    }],
  };
  const report = buildUserJourney(definition, [
    { variant: "iam", key: ASSIGNED_KEY, users: 100 },
    { variant: "iam", key: "a", users: 90 },
    { variant: "iam", key: "b", users: 50 },
    { variant: "iam", key: "c", users: 5 },
    { variant: "iam", key: "paywall_seen", users: 40 },
  ]);
  const variant = report.variants[0];
  assert.equal(variant.completionShare, 0.4);
  const drops = journeyDrops(variant.steps, variant.assigned);
  assert.equal(drops.find((drop) => drop.attribute === "b")?.lost, 40);
  assert.equal(drops.find((drop) => drop.attribute === "paywall_seen")?.lost, 10);
  assert.equal(drops.find((drop) => drop.attribute === "c")?.branch, true);
  assert.deepEqual(largestDropAttributes(drops), ["b", "a", "paywall_seen"]);
  const html = renderToStaticMarkup(createElement(UserJourneyFunnel, { report, windowLabel: "Last 7 days" }));
  assert.match(html, /IAM/);
  assert.match(html, /\(40%\)/);
  assert.match(html, /#40/);
});

test("a variant with no screen attributes stays out of the chart", () => {
  const report = buildUserJourney(userJourneyDefinition("versy")!, [
    { variant: "bible_widget_shorter", key: ASSIGNED_KEY, users: 12 },
  ]);
  const html = renderToStaticMarkup(createElement(UserJourneyFunnel, { report, windowLabel: "Last 7 days" }));
  assert.match(html, /none of them have a screen-reached attribute yet/);
  assert.doesNotMatch(html, /bible_widget_entry_screen_seen/);
});

test("journey sql stays inside the install window and the variant list", () => {
  const glow = userJourneyDefinition("glow")!;
  const sql = userJourneySql(54736, glow, "2026-09-18 00:00:00.000", "2026-09-25 00:00:00.000");
  assert.match(sql, /applicationId = 54736/);
  assert.match(sql, /appInstallDate >=/);
  assert.match(sql, /'iam', 'copy'/);
  assert.match(sql, /welcome_screen_seen/);
  assert.match(sql, /endsWith\(key, '__onboarding_iam_complete'\)/);
  assert.match(sql, /endsWith\(key, '__onboarding_complete_copy'\)/);
  const versy = userJourneySql(51393, userJourneyDefinition("versy")!, "2026-09-18 00:00:00.000", "2026-09-25 00:00:00.000");
  assert.match(versy, /bible_widget_paywall_screen_seen/);
  assert.match(versy, /'bible_widget', 'bible_widget_shorter'/);
  assert.doesNotMatch(versy, /onboarding_short_prayer/);
  assert.match(versy, /versy_onboarding_journey_variant/);
  assert.match(versy, /versy_onboarding_journey_schema/);
  assert.doesNotMatch(versy, /HAVING tuple/);
  assert.doesNotMatch(sql, /HAVING tuple/);
  assert.throws(() => userJourneySql(54736, glow, "2026-09-18'; drop", "2026-09-25 00:00:00.000"));
});

test("Versy shows both families before data arrives and keeps the shorter route distinct", () => {
  const definition = userJourneyDefinition("versy")!;
  const empty = buildUserJourney(definition, []);
  const html = renderToStaticMarkup(createElement(UserJourneyFunnel, { report: empty, windowLabel: "Last 7 days" }));
  assert.match(html, /Bible Widget/);
  assert.match(html, /Bible Scroll/);
  assert.match(html, /Widget route/);
  assert.match(html, /Shorter/);
  assert.match(html, /No tracked Bible Widget installs/);
  assert.equal(empty.status, "empty");
  assert.ok(empty.variants.every((row) => row.completionShare === 0 && !row.recorded));
  const widget = definition.variants[0];
  assert.equal(widget.steps.find((step) => step.attribute === "versy_journey_bible_widget_reviews_screen_seen")?.branch, true);
  const report = buildUserJourney(definition, [
    { variant: "scroll_the_bible", key: ASSIGNED_KEY, users: 10 },
    { variant: "scroll_the_bible", key: "scroll_bible_trial_screen_seen", users: 8 },
  ]);
  assert.equal(report.variants[2].completionShare, 0, "old screen flags cannot become current-flow visits");
});
