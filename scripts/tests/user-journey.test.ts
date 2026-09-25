import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import UserJourneyFunnel from "../../components/analytics/UserJourneyFunnel";
import { ASSIGNED_KEY, buildUserJourney, journeyDrops, largestDropAttributes, userJourneyDefinition, type UserJourneyDefinition } from "../../lib/user-journey";
import { userJourneySql } from "../../lib/user-journey-queries";

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
  const prayer = versy.variants.find((variant) => variant.key === "short-1-prayer")!;
  const widget = versy.variants.find((variant) => variant.key === "bible_widget")!;
  assert.equal(prayer.steps[0].attribute, "entry_screen_seen");
  assert.equal(prayer.steps.at(-1)?.attribute, "paywall_seen");
  assert.equal(prayer.steps.at(-1)?.attributeKey, "paywall_placement");
  assert.equal(prayer.steps.find((step) => step.branch)?.attribute, "notifications_denied_screen_seen");
  assert.equal(widget.steps[0].attribute, "bible_widget_entry_screen_seen");
  assert.equal(widget.steps.at(-1)?.attribute, "bible_widget_paywall_screen_seen");
  assert.equal(widget.steps.at(-1)?.paywall, true);
  assert.notEqual(prayer.steps[0].attribute, widget.steps[0].attribute);
  assert.equal(userJourneyDefinition("poky"), null);
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
    { variant: "short-1-prayer", key: ASSIGNED_KEY, users: 12 },
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
  assert.match(versy, /paywall_placement/);
  assert.match(versy, /onboarding_short_prayer/);
  assert.throws(() => userJourneySql(54736, glow, "2026-09-18'; drop", "2026-09-25 00:00:00.000"));
});
