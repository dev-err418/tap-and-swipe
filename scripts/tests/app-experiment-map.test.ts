import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppExperimentMap, { currentBestPathNodeIds, currentBestVariants, currentCohortMetrics, currentPaywallMetrics } from "../../components/analytics/AppExperimentMap";
import { activeABTestCount, appExperimentMap } from "../../lib/app-experiment-map";
import { appExperimentFlow } from "../../lib/app-experiment-flow";
import type { MobileAppExperiment, MobileAppExperimentVariant } from "../../lib/mobile-app-analytics";
import { NATIVE_PAYWALL_DEMO_REPORT } from "../../lib/native-paywall-demo";
import { nativePaywallAllocation } from "../../lib/native-paywall-allocation";
import { orderAppExperiments } from "../../lib/app-experiment-order";
import { GLOW_EXPERIMENT_START_MS, glowExperimentStart } from "../../lib/glow-experiment-window";
import { POKY_EXPERIMENT_START_MS, pokyExperimentStart } from "../../lib/poky-experiment-window";
import { buildGlowOnboardingReport, GLOW_ONBOARDING_KEY, GLOW_ONBOARDING_ID } from "../../lib/glow-onboarding-experience";

test("Glow experiment data begins at Sep 20, 2026 08:00 GMT+2", () => {
  assert.equal(GLOW_EXPERIMENT_START_MS, Date.parse("2026-09-20T06:00:00.000Z"));
  assert.equal(glowExperimentStart(Date.parse("2026-09-01T00:00:00.000Z")), GLOW_EXPERIMENT_START_MS);
  assert.equal(glowExperimentStart(Date.parse("2026-09-21T00:00:00.000Z")), Date.parse("2026-09-21T00:00:00.000Z"));
  assert.match(appExperimentMap("glow")!.notes[0], /September 20, 2026 at 08:00 GMT\+2/);
});

test("Poky experiment data begins at Sep 20, 2026 16:00 GMT+2", () => {
  assert.equal(POKY_EXPERIMENT_START_MS, Date.parse("2026-09-20T14:00:00.000Z"));
  assert.equal(pokyExperimentStart(Date.parse("2026-09-01T00:00:00.000Z")), POKY_EXPERIMENT_START_MS);
  assert.equal(pokyExperimentStart(Date.parse("2026-09-21T00:00:00.000Z")), Date.parse("2026-09-21T00:00:00.000Z"));
  assert.match(appExperimentMap("poky")!.notes[0], /September 20, 2026 at 16:00 GMT\+2/);
});

test("every configured audience has a complete, valid allocation", () => {
  for (const app of ["glow", "poky", "versy"]) {
    const map = appExperimentMap(app);
    assert.ok(map);
    assert.equal(new Set(map.tests.map((experiment) => experiment.id)).size, map.tests.length);
    for (const experiment of map.tests) {
      assert.equal(experiment.branches.reduce((sum, branch) => sum + branch.percent, 0), 100);
      assert.ok(experiment.branches.every((branch) => Number.isFinite(branch.percent) && branch.percent > 0));
      assert.equal(new Set(experiment.branches.map((branch) => branch.id)).size, experiment.branches.length);
    }
  }
});

test("Glow keeps onboarding and paywall assignments after retiring the Journal comparison", () => {
  const map = appExperimentMap("glow")!;
  assert.equal(map.tests[0].planned, true);
  assert.deepEqual(map.tests[0].branches.map((b) => b.percent), [15, 85]);
  assert.deepEqual(map.tests.map((experiment) => experiment.id), ["onboarding_mascot_v1", "glow-onboarding-copy", "native_paywalls_v3"]);
  assert.equal(appExperimentFlow("glow")?.nodes.find((node) => node.id === "home")?.label, "Practice");
  assert.ok(map.notes.some((note) => note.includes("Glow 1.7.3 extends English yearly-only yr_59 presentations through September 28")));
  assert.deepEqual(map.tests[1].branches.map((branch) => branch.percent), [50, 50]);
  assert.deepEqual(map.tests[2].branches.map((branch) => branch.percent), [100 / 6, 100 / 6, 100 / 6, 25, 25]);
  for (const branch of map.tests[2].branches) {
    assert.equal(branch.percent, nativePaywallAllocation("native_paywalls_v3", branch.id, branch.id));
  }
});

test("Poky shows independent intro and plan design splits with four equal plan cohorts", () => {
  const map = appExperimentMap("poky")!;
  for (const experiment of map.tests.filter((row) => row.id !== "poky-localized-paywalls")) {
    assert.deepEqual(experiment.branches.map((branch) => branch.percent), [50, 50]);
  }
  assert.deepEqual(map.tests.find((row) => row.id === "poky-localized-paywalls")?.branches.map((branch) => branch.percent), [100]);
  assert.deepEqual(map.tests.find((row) => row.id === "poky-plan-design-combinations")?.branches.map((branch) => branch.id), ["plan_a", "plan_b"]);
  assert.deepEqual(map.combinations?.map((branch) => branch.percent), [25, 25, 25, 25]);
  assert.deepEqual(map.combinations?.map((branch) => branch.id), ["control-plan_a", "control-plan_b", "animated_plan-plan_a", "animated_plan-plan_b"]);
  assert.deepEqual(map.tests.find((row) => row.id === "poky-trial-vs-current")?.branches.map((branch) => branch.id), ["current", "trial"]);
  assert.match(map.tests.find((row) => row.id === "poky-native-recovery-holdout")!.scope, /any origin placement/);
});

test("Versy shows yearly-only soft/hard paywalls with independent onboarding and price assignments", () => {
  const map = appExperimentMap("versy")!;
  assert.deepEqual(map.tests.map((row) => row.id), [
    "versy-bible-widget-shorter-v1", "versy-yearly-paywall-access-v1", "versy-yearly-price-v1",
  ]);
  assert.deepEqual(map.tests.map((row) => row.branches.map((branch) => branch.percent)),
    [[50, 50], [50, 50], [100 / 3, 100 / 3, 100 / 3]]);
  assert.deepEqual(map.tests[0].branches.map((branch) => branch.id), ["bible_widget", "bible_widget_shorter"]);
  assert.deepEqual(map.tests[1].branches.map((branch) => branch.id), ["dismissible", "hard"]);
  assert.deepEqual(map.tests[2].branches.map((branch) => branch.id), [
    "com.arthurbuildsstuff.bible.yearly_3999_80",
    "com.arthurbuildsstuff.bible.yearly_2999_80",
    "com.arthurbuildsstuff.bible.yearly_4999_80",
  ]);
  assert.equal(map.combinations?.length, 6);
  assert.ok(map.combinations?.every((branch) => branch.id.startsWith("yearly_only|") && branch.percent === 100 / 6));
  assert.ok(map.tests.every((row) => row.branches.every((branch) => branch.id !== "yearly_weekly")));
  assert.equal(appExperimentFlow("versy")?.nodes.filter((node) => node.experimentId).length, 7);
  assert.equal(activeABTestCount("versy"), 3);
});

test("unsupported apps do not show invented experiments", () => {
  assert.equal(appExperimentMap("unknown"), null);
});

test("active A/B counts include the new plan design and trial offer assignments", () => {
  assert.equal(activeABTestCount("glow"), 2);
  assert.equal(activeABTestCount("poky"), 6);
  assert.equal(activeABTestCount("versy"), 3);
});

test("result cards follow the onboarding-to-paywall progression without mutating inputs", () => {
  for (const [app, expected] of Object.entries({
    glow: ["glow-onboarding-copy", "glow-native-paywall", "glow-yearly-price"],
    poky: ["poky-plan-design-combinations", "poky-animated-plan", "poky-trial-vs-current", "poky-superwall-vs-native", "poky-native-recovery-holdout"],
    versy: ["versy-bible-widget-shorter-v1", "versy-yearly-paywall-access-v1", "versy-yearly-price-v1", "versy-yearly-paywall-configuration-v1"],
  })) {
    const input = [...expected].reverse().map((id) => ({ id }));
    assert.deepEqual(orderAppExperiments(app, input).map((row) => row.id), expected);
    assert.deepEqual(input.map((row) => row.id), [...expected].reverse());
  }
  assert.deepEqual(orderAppExperiments("unknown", [{ id: "b" }, { id: "a" }]), [{ id: "b" }, { id: "a" }]);
});

test("recovery map uses native assignment identities, never legacy Superwall variants", () => {
  const recovery = appExperimentMap("poky")!.tests.at(-1)!;
  assert.equal(recovery.id, "poky-native-recovery-holdout");
  assert.deepEqual(recovery.branches.map((branch) => branch.id), ["recovery", "holdout"]);
  const nodes = appExperimentFlow("poky")!.nodes.filter((node) => node.experimentId === recovery.id);
  assert.deepEqual(nodes.map((node) => node.variantId), ["recovery", "holdout"]);
});

test("trial branch goes directly to one native paywall without Superwall or recovery", () => {
  const flow = appExperimentFlow("poky")!;
  const outgoing = flow.edges.filter((edge) => edge.from === "offer-trial");
  assert.deepEqual(outgoing, []);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "language" && edge.to.startsWith("offer-"))
    .map((edge) => [edge.to, edge.label]), [["offer-current", "50%"], ["offer-trial", "50%"]]);
  assert.deepEqual(flow.edges.filter((edge) => edge.to === "superwall" || edge.to === "native")
    .map((edge) => edge.from), ["offer-current", "offer-current"]);
});

test("configured maps render their percentage badges without analytics data", () => {
  for (const app of ["glow", "poky", "versy"]) {
    const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: app }));
    assert.match(markup, /Experiment map/);
    assert.match(markup, /Configured allocation/);
    assert.match(markup, /<svg/);
    if (app === "glow") {
      assert.match(markup, />15%<\/text>/);
      assert.match(markup, />85%<\/text>/);
      assert.match(markup, /Enrollment off/);
    } else assert.match(markup, />50%<\/text>/);
    assert.match(markup, /Start/);
    assert.match(markup, /onboarding/);
  }
  assert.equal(renderToStaticMarkup(createElement(AppExperimentMap, { appId: "unknown" })), "");
});

test("Poky map shows four plan cohorts with independent intro assignments", () => {
  const flow = appExperimentFlow("poky")!;
  const cohorts = experiment("poky-plan-design-combinations", "appu", [
    variant("animated_plan_a", { installs: 50, proceeds: 20 }),
    variant("animated_plan_b", { installs: 50, proceeds: 10 }),
    variant("no_intro_plan_a", { installs: 50, proceeds: 5 }),
    variant("no_intro_plan_b", { installs: 50, proceeds: 15 }),
  ]);
  const metrics = currentCohortMetrics(flow.nodes, flow.edges, [cohorts]);
  assert.equal(metrics.get("intro-control")?.appu, 0.2);
  assert.equal(metrics.get("intro-animated_plan")?.appu, 0.3);
  assert.equal(metrics.get("plan-no_intro_plan_a")?.appu, 0.1);
  assert.equal(metrics.get("plan-animated_plan_a")?.appu, 0.4);
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "poky", experiments: [cohorts] }));
  assert.match(markup, /No intro \(100\)/);
  assert.match(markup, /Animated plan intro \(100\)/);
  assert.match(markup, /Intro \+ Plan A \(50\)/);
  assert.match(markup, /No intro \+ Plan B \(50\)/);
  assert.match(markup, /APPU \$0\.40/);
  assert.doesNotMatch(markup, /Original|Warm experience/);
});

test("map labels count assigned people for ordinary variants and leave routing cards uncounted", () => {
  const offer = experiment("poky-trial-vs-current", "appu", [
    variant("current", { users: 23, installs: 25 }),
    variant("trial", { installs: 1_234 }),
  ]);
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "poky", experiments: [offer] }));
  assert.match(markup, /Current paywall flow \(23\)/);
  assert.match(markup, /3-day trial · native \(1,234\)/);
  assert.match(markup, />Paywall language<\/text>/);
  assert.doesNotMatch(markup, /Paywall language \(/);
});

test("Poky plan paths do not cross between intro groups", () => {
  const flow = appExperimentFlow("poky")!;
  const planEdges = flow.edges.filter((edge) => edge.to.startsWith("plan-"));
  assert.equal(planEdges.length, 4);
  assert.deepEqual(planEdges.map((edge) => [edge.from, edge.to]), [
    ["intro-control", "plan-no_intro_plan_a"],
    ["intro-control", "plan-no_intro_plan_b"],
    ["intro-animated_plan", "plan-animated_plan_a"],
    ["intro-animated_plan", "plan-animated_plan_b"],
  ]);
  const active = currentBestPathNodeIds(flow.nodes, flow.edges, new Set([
    "intro-animated_plan", "plan-animated_plan_a", "plan-no_intro_plan_b",
  ]));
  assert.equal(active.has("plan-animated_plan_a"), true);
  assert.equal(active.has("plan-no_intro_plan_b"), false);
});

test("Poky intro parents use observed cohort weights and missing data stays unavailable", () => {
  const flow = appExperimentFlow("poky")!;
  const cohorts = experiment("poky-plan-design-combinations", "appu", [
    variant("animated_plan_a", { installs: 90, proceeds: 270 }),
    variant("animated_plan_b", { installs: 10, proceeds: 60 }),
    variant("no_intro_plan_a", { installs: 90, proceeds: 9 }),
    variant("no_intro_plan_b", { installs: 10, proceeds: 5 }),
  ]);
  const metrics = currentCohortMetrics(flow.nodes, flow.edges, [cohorts]);
  assert.equal(metrics.get("intro-animated_plan")?.appu, 3.3);
  assert.equal(metrics.get("intro-control")?.appu, 0.14);
  assert.equal(metrics.get("plan-animated_plan_a")?.appu, 3);
  assert.equal(metrics.get("plan-animated_plan_b")?.appu, 6);
  const partial = currentCohortMetrics(flow.nodes, flow.edges, [{ ...cohorts, variants: cohorts.variants.slice(0, 1) }]);
  assert.equal(partial.get("intro-animated_plan")?.appu, null);
  assert.equal(partial.get("plan-animated_plan_a")?.appu, 3);
  assert.equal(partial.get("plan-animated_plan_a")?.isBest, false);
});

test("Poky map uses the selected language's plan cohorts", () => {
  const cohorts = experiment("poky-plan-design-combinations", "appu", [
    variant("animated_plan_a", { installs: 10, proceeds: 1000 }),
    variant("animated_plan_b", { installs: 10, proceeds: 1000 }),
    variant("no_intro_plan_a", { installs: 10, proceeds: 1000 }),
    variant("no_intro_plan_b", { installs: 10, proceeds: 1000 }),
  ]);
  cohorts.languageVariants = { en: [
    variant("animated_plan_a", { installs: 30, proceeds: 30 }),
    variant("animated_plan_b", { installs: 10, proceeds: 30 }),
    variant("no_intro_plan_a", { installs: 5, proceeds: 0 }),
    variant("no_intro_plan_b", { installs: 5, proceeds: 0 }),
  ] };
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, {
    appId: "poky", experiments: [cohorts], nativePaywalls: NATIVE_PAYWALL_DEMO_REPORT,
  }));
  assert.match(markup, /APPU \$1\.50/);
  assert.match(markup, /40 users · \$60\.00 net proceeds/);
  assert.doesNotMatch(markup, /APPU \$100\.00/);
});

test("the map does not call a tied or data-less result best", () => {
  const tied = experiment("glow-onboarding-copy", "appu", [
    variant("iam", { installs: 100, proceeds: 10 }),
    variant("copy", { installs: 100, proceeds: 10 }),
  ]);
  const missing = experiment("poky-animated-plan", "appu_d7", [
    variant("control", { installsD7: 100, proceedsD7: 10 }),
    variant("animated_plan"),
  ]);
  assert.equal(currentBestVariants([tied, missing]).size, 0);
});

test("the map falls back to overall APPU when fixed-age branches are not mature", () => {
  const immature = experiment("poky-animated-plan", "appu_d7", [
    variant("control", { installs: 100, proceeds: 30 }),
    variant("animated_plan", { installs: 100, proceeds: 20 }),
  ]);
  assert.equal(currentBestVariants([immature]).get("poky-animated-plan"), "control");
});

test("paywall variants use compact APPU/CR cards and highlight the unique APPU leader", () => {
  const flow = appExperimentFlow("glow")!;
  const metrics = currentPaywallMetrics(flow.nodes, NATIVE_PAYWALL_DEMO_REPORT);
  assert.equal(metrics.size, 5);
  assert.ok([...metrics.values()].every((metric) => metric.appu != null && metric.conversionRate != null));
  assert.ok([...metrics.values()].every((metric) => metric.users != null));

  const markup = renderToStaticMarkup(createElement(AppExperimentMap, {
    appId: "glow",
    nativePaywalls: NATIVE_PAYWALL_DEMO_REPORT,
  }));
  assert.match(markup, /Experiment map language audience/);
  assert.match(markup, /English/);
  assert.match(markup, /Spanish/);
  assert.match(markup, /German/);
  assert.equal(markup.match(/APPU \$/g)?.length, 5);
  assert.equal(markup.match(/ · CR /g)?.length, 5);
  assert.match(markup, /fill="#fff0e4"/);
  const englishUsers = currentPaywallMetrics(flow.nodes, NATIVE_PAYWALL_DEMO_REPORT, "en").get("yr_49")!.users!;
  assert.match(markup, new RegExp(`yr_49 \\(${englishUsers.toLocaleString("en-US")}\\)`));
  assert.match(markup, /stroke="#d98245"/);
  assert.match(markup, /stroke-width="3"/);
  assert.doesNotMatch(markup, /height="68"/);
  assert.doesNotMatch(markup, /% conf/);
});

test("the map language picker scopes paywall metrics to the selected audience", () => {
  const flow = appExperimentFlow("glow")!;
  const english = currentPaywallMetrics(flow.nodes, NATIVE_PAYWALL_DEMO_REPORT, "en");
  const spanish = currentPaywallMetrics(flow.nodes, NATIVE_PAYWALL_DEMO_REPORT, "es");
  assert.equal(english.size, 5);
  assert.equal(spanish.size, 5);
  assert.notEqual(english.get("yr_49")?.appu, spanish.get("yr_49")?.appu);

  const poky = appExperimentFlow("poky")!;
  const pokyEnglish = currentPaywallMetrics(poky.nodes, NATIVE_PAYWALL_DEMO_REPORT, "en");
  assert.equal(pokyEnglish.get("name-2-es")?.appu, null);
  assert.equal(pokyEnglish.get("name-2-de")?.appu, null);
});

test("Poky flow only includes main paywalls for the selected language", () => {
  const english = appExperimentFlow("poky", "en")!;
  const englishPaywalls = english.nodes.filter((node) => node.paywallMetric);
  assert.deepEqual(englishPaywalls.map((node) => node.id), ["624224", "624761"]);
  assert.ok(englishPaywalls.every((node) => node.paywallMetric?.language === "en"));
  assert.equal(english.edges.filter((edge) => edge.from === "language").length, 2);
  assert.deepEqual(english.edges.filter((edge) => edge.from === "language").map((edge) => edge.to), ["offer-current", "offer-trial"]);
  assert.equal(english.edges.filter((edge) => edge.from === "native").length, 2);
  assert.equal(english.edges.filter((edge) => edge.to === "cancel").length, 2);

  const spanish = appExperimentFlow("poky", "es")!;
  const spanishPaywalls = spanish.nodes.filter((node) => node.paywallMetric);
  assert.deepEqual(spanishPaywalls.map((node) => node.id), ["name-2-es"]);
  assert.equal(spanishPaywalls[0].paywallMetric?.language, "es");
});

test("Glow's experience map uses all assigned users regardless of paywall language", () => {
  const start = Date.parse("2026-10-01T00:00:00Z");
  const report = buildGlowOnboardingReport([
    { appUserId: "spanish", key: GLOW_ONBOARDING_KEY, value: JSON.stringify({
      schema: 1, experiment: GLOW_ONBOARDING_ID, allocation: "15_85", environment: "production",
      variant: "mascot_free", language: "es", randomized: true, assignedAt: start, updatedAt: start,
      days: { "0": { sessions: 1, active: true } },
    }) },
  ], [], start, start + 86400000, start + 86400000);
  const localized = experiment("glow-onboarding-copy", "appu", [
    variant("iam", { installs: 10, proceeds: 90 }), variant("copy", { installs: 10, proceeds: 80 }),
  ]);
  localized.languageVariants = { en: [variant("iam", { installs: 10, proceeds: 1 }), variant("copy", { installs: 10, proceeds: 2 })] };
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, {
    appId: "glow", experiments: [localized], nativePaywalls: NATIVE_PAYWALL_DEMO_REPORT, onboardingExperience: report,
  }));
  assert.match(markup, /ARPU \$0\.00/);
  assert.match(markup, /No mascot \(1\)/);
  assert.doesNotMatch(markup, /APPU \$9\.00|APPU \$8\.00|APPU \$0\.10|APPU \$0\.20/);
});

test("the map language picker scopes localized legacy experiment APPU", () => {
  const localized = experiment("versy-bible-widget-shorter-v1", "appu", [
    variant("bible_widget", { installs: 10, proceeds: 90 }), variant("bible_widget_shorter", { installs: 10, proceeds: 80 }),
  ]);
  localized.languageVariants = {
    en: [variant("bible_widget", { installs: 10, proceeds: 1 }), variant("bible_widget_shorter", { installs: 10, proceeds: 2 })],
  };
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, {
    appId: "versy",
    experiments: [localized],
    nativePaywalls: NATIVE_PAYWALL_DEMO_REPORT,
  }));
  assert.match(markup, /APPU \$0\.10/);
  assert.match(markup, /APPU \$0\.20/);
  assert.doesNotMatch(markup, /APPU \$9\.00|APPU \$8\.00/);
});

test("flows have one onboarding origin, valid left-to-right edges and no disconnected nodes", () => {
  for (const app of ["glow", "poky", "versy"]) {
    const flow = appExperimentFlow(app)!;
    const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
    assert.equal(nodes.size, flow.nodes.length);
    assert.deepEqual(flow.nodes.filter((node) => node.kind === "start").map((node) => node.id), ["start"]);
    const visited = new Set(["start"]);
    for (let pass = 0; pass < flow.nodes.length; pass++) {
      for (const edge of flow.edges) {
        const from = nodes.get(edge.from)!;
        const to = nodes.get(edge.to)!;
        assert.ok(from && to);
        assert.ok(from.x + from.width < to.x);
        if (visited.has(from.id)) visited.add(to.id);
      }
    }
    assert.equal(visited.size, nodes.size);
    for (const node of flow.nodes) {
      assert.ok(node.x >= 0 && node.x + node.width <= flow.width);
      assert.ok(node.y - 26 >= 0 && node.y + 26 <= flow.height);
    }
  }
  assert.equal(appExperimentFlow("unknown"), null);
});

test("Poky branches through intro, plan, offer and paywalls before conditional recovery", () => {
  const flow = appExperimentFlow("poky")!;
  const plans = flow.nodes.filter((node) => node.cohortMetric?.variants.length === 1);
  assert.equal(plans.length, 4);
  for (const plan of plans) {
    assert.ok(flow.edges.some((edge) => edge.to === plan.id && edge.label === "50%"));
    assert.ok(flow.edges.some((edge) => edge.from === plan.id && edge.to === "language"));
  }
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "language").map((edge) => edge.label), ["50%", "50%"]);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "native").map((edge) => edge.label), ["50%", "50%", "100%", "100%", "100%"]);
  assert.ok(flow.edges.some((edge) => edge.from === "superwall" && edge.to === "superwall-recovery"));
  const triggers = flow.edges.filter((edge) => edge.to === "cancel");
  assert.equal(triggers.length, 5);
  assert.ok(triggers.every((edge) => edge.conditional && edge.label === undefined));
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "cancel").map((edge) => edge.label), ["50%", "50%"]);
});

test("Glow shares all five paywalls after either onboarding flow without clipping nodes", () => {
  const flow = appExperimentFlow("glow")!;
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "start").map((edge) => edge.label), ["15%", "85%"]);
  assert.equal(flow.edges.filter((edge) => edge.to === "placements").length, 2);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "placements").map((edge) => edge.label), ["~17%", "~17%", "~17%", "25%", "25%"]);
  assert.ok(flow.nodes.every((node) => node.y + 40 < flow.height));
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "home"), []);
  assert.equal(flow.edges.filter((edge) => edge.to === "home").length, 5);
  assert.ok(flow.nodes.every((node) => node.x + node.width < flow.width));
  assert.ok(flow.nodes.every((node) => node.experimentId !== "journal_vs_practice_v1"));
});

function experiment(
  id: string,
  metric: NonNullable<MobileAppExperiment["scoreMetrics"]>[number],
  variants: MobileAppExperimentVariant[],
): MobileAppExperiment {
  return { id, title: id, subtitle: "", scoreMetrics: [metric], variants };
}

function variant(key: string, values: Partial<MobileAppExperimentVariant> = {}): MobileAppExperimentVariant {
  return {
    key,
    label: key,
    countries: {},
    users: 0,
    sessions: 0,
    installs: 0,
    completed: 0,
    trials: 0,
    converted: 0,
    paid: 0,
    proceeds: 0,
    installsD7: 0,
    proceedsD7: 0,
    eligibleD7: 0,
    retainedD7: 0,
    installsD14: 0,
    proceedsD14: 0,
    eligibleD14: 0,
    retainedD14: 0,
    installsD30: 0,
    proceedsD30: 0,
    eligibleD30: 0,
    retainedD30: 0,
    ...values,
  };
}
