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

test("Glow includes configured onboarding, paywall and Journal VS Practice assignments", () => {
  const map = appExperimentMap("glow")!;
  assert.deepEqual(map.tests.map((experiment) => experiment.id), ["glow-onboarding-copy", "native_paywalls_v3", "journal_vs_practice_v1"]);
  assert.deepEqual(map.tests[2].branches.map((branch) => [branch.id, branch.percent]), [["journal", 30], ["practice", 70]]);
  assert.match(map.tests[2].scope, /enabled in next app release/);
  assert.equal(appExperimentFlow("glow")?.nodes.find((node) => node.id === "home")?.detail, "Next app release");
  assert.deepEqual(map.tests[0].branches.map((branch) => branch.percent), [50, 50]);
  assert.deepEqual(map.tests[1].branches.map((branch) => branch.percent), [100 / 6, 100 / 6, 100 / 6, 25, 25]);
  for (const branch of map.tests[1].branches) {
    assert.equal(branch.percent, nativePaywallAllocation("native_paywalls_v3", branch.id, branch.id));
  }
});

test("Poky shows a 90/10 experience split, 50/50 plan split and four joint combinations", () => {
  const map = appExperimentMap("poky")!;
  for (const experiment of map.tests.filter((row) => row.id !== "poky-localized-paywalls" && row.id !== "poky-app-experience")) {
    assert.deepEqual(experiment.branches.map((branch) => branch.percent), [50, 50]);
  }
  assert.deepEqual(map.tests.find((row) => row.id === "poky-app-experience")?.branches.map((branch) => branch.percent), [10, 90]);
  assert.deepEqual(map.tests.find((row) => row.id === "poky-localized-paywalls")?.branches.map((branch) => branch.percent), [100]);
  assert.deepEqual(map.combinations?.map((branch) => branch.percent), [5, 45, 5, 45]);
  assert.match(map.tests.find((row) => row.id === "poky-app-experience")!.scope, /next app release/);
  assert.match(map.tests.find((row) => row.id === "poky-native-recovery-holdout")!.scope, /any origin placement/);
});

test("Versy shows the prepared split without claiming it is active", () => {
  const map = appExperimentMap("versy")!;
  assert.deepEqual(map.tests.map((row) => row.id), ["versy-bible-wdiget-v1"]);
  assert.deepEqual(map.tests[0].branches.map((branch) => branch.id), ["short-1-prayer", "bible_wdiget"]);
  assert.deepEqual(map.tests[0].branches.map((branch) => branch.percent), [50, 50]);
  assert.equal(map.tests[0].planned, true);
  assert.equal(activeABTestCount("versy"), 0);
});

test("unsupported apps do not show invented experiments", () => {
  assert.equal(appExperimentMap("unknown"), null);
});

test("active A/B counts exclude historical comparisons and single-offer allocations", () => {
  assert.equal(activeABTestCount("glow"), 3);
  assert.equal(activeABTestCount("poky"), 4);
  assert.equal(activeABTestCount("versy"), 0);
});

test("result cards follow the onboarding-to-paywall progression without mutating inputs", () => {
  for (const [app, expected] of Object.entries({
    glow: ["glow-onboarding-copy", "glow-native-paywall", "glow-yearly-price"],
    poky: ["poky-app-experience", "poky-animated-plan", "poky-onboarding-abcd", "poky-superwall-vs-native", "poky-native-recovery-holdout"],
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

test("configured maps render their percentage badges without analytics data", () => {
  for (const app of ["glow", "poky", "versy"]) {
    const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: app }));
    assert.match(markup, /Experiment map/);
    assert.match(markup, /Configured allocation/);
    assert.match(markup, /<svg/);
    assert.match(markup, />50%<\/text>/);
    assert.match(markup, /Start/);
    assert.match(markup, /onboarding/);
  }
  assert.equal(renderToStaticMarkup(createElement(AppExperimentMap, { appId: "unknown" })), "");
});

test("the map shows APPU for every experiment step and marks the current leader", () => {
  const experiments: MobileAppExperiment[] = [
    experiment("poky-onboarding-abcd", "appu", [
      variant("extra_original", { installs: 50, proceeds: 4 }),
      variant("intro_original", { installs: 50, proceeds: 8 }),
      variant("extra_chat", { installs: 50, proceeds: 3 }),
      variant("intro_chat", { installs: 50, proceeds: 15 }),
    ]),
    experiment("poky-animated-plan", "appu_d7", [
      variant("control", { installs: 100, proceeds: 20, installsD7: 100, proceedsD7: 20 }),
      variant("animated_plan", { installs: 100, proceeds: 30, installsD7: 100, proceedsD7: 30 }),
    ]),
    experiment("poky-app-experience", "sessions_per_day", [
      variant("control", { users: 100, sessions: 200, proceeds: 12 }),
      variant("new_experience", { users: 100, sessions: 250, proceeds: 18 }),
    ]),
    experiment("poky-native-recovery-holdout", "appu", [
      variant("holdout", { installs: 100, proceeds: 10 }),
      variant("recovery", { installs: 100, proceeds: 20 }),
    ]),
  ];

  assert.deepEqual([...currentBestVariants(experiments)], [
    ["poky-onboarding-abcd", "intro_chat"],
    ["poky-animated-plan", "animated_plan"],
    ["poky-app-experience", "new_experience"],
    ["poky-native-recovery-holdout", "recovery"],
  ]);
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "poky", experiments }));
  assert.doesNotMatch(markup, />BEST<\/text>/);
  assert.doesNotMatch(markup, /% conf|% better|50\/50 in next release|25% of new assignments/);
  assert.match(markup, /APPU \$0\.12/);
  assert.match(markup, /APPU \$0\.18/);
  assert.match(markup, /APPU \$0\.06/);
  assert.match(markup, /APPU \$0\.30/);
  assert.match(markup, /APPU — · CR —/); // Recovery waits for the shared Paywalls report.
  assert.match(markup, /stroke-width="3"/);
});

test("repeated downstream winners highlight only the branch under the winning parent", () => {
  const flow = appExperimentFlow("poky")!;
  const candidates = new Set([
    "background-new_experience",
    "background-control-animated_plan",
    "background-new_experience-animated_plan",
  ]);
  const active = currentBestPathNodeIds(flow.nodes, flow.edges, candidates);
  assert.equal(active.has("background-new_experience"), true);
  assert.equal(active.has("background-new_experience-animated_plan"), true);
  assert.equal(active.has("background-new_experience-control"), false);
  assert.equal(active.has("background-control-animated_plan"), false);
});

test("Poky parents use the user-weighted APPU of their own joint-cohort children", () => {
  const flow = appExperimentFlow("poky")!;
  const cohorts = experiment("poky-onboarding-abcd", "appu_d7", [
    variant("extra_original", { installs: 90, proceeds: 9 }),
    variant("intro_original", { installs: 10, proceeds: 5 }),
    variant("extra_chat", { installs: 90, proceeds: 270, installsD7: 90, proceedsD7: 270 }),
    variant("intro_chat", { installs: 10, proceeds: 60, installsD7: 10, proceedsD7: 0 }),
  ]);
  const unrelated = [
    { ...experiment("poky-app-experience", "sessions_per_day", [
      variant("new_experience", { users: 10, proceeds: 249.4 }),
    ]), paidUsersOnly: true },
    experiment("poky-animated-plan", "appu", [
      variant("control", { installs: 100, proceeds: 382 }),
      variant("animated_plan", { installs: 100, proceeds: 318 }),
    ]),
  ];
  const metrics = currentCohortMetrics(flow.nodes, flow.edges, [cohorts, ...unrelated]);
  const parent = metrics.get("background-new_experience")!;
  const standard = metrics.get("background-new_experience-control")!;
  const animated = metrics.get("background-new_experience-animated_plan")!;
  assert.equal(parent.users, 100);
  assert.equal(parent.proceeds, 330);
  assert.equal(parent.appu, 3.3); // Observed 90/10 weighting, not configured 50/50 (4.5).
  assert.equal(parent.appu, (standard.appu! * standard.users + animated.appu! * animated.users) / parent.users);
  assert.equal(metrics.get("background-control")!.appu, 0.14);
  assert.equal(metrics.get("background-control-control")!.appu, 0.1);
  assert.equal(standard.appu, 3);
  assert.equal(animated.appu, 6);
  assert.equal(parent.isBest, true);
  assert.equal(standard.isBest, false);
  assert.equal(animated.isBest, true); // Highlight matches displayed total APPU, not D7.
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "poky", experiments: [cohorts, ...unrelated] }));
  assert.match(markup, /APPU \$3\.30/);
  assert.match(markup, /APPU \$6\.00/);
  assert.doesNotMatch(markup, /APPU \$24\.94|APPU \$3\.82|APPU \$3\.18/);
  assert.doesNotMatch(markup, /Paywall percentages apply|Results start September|Background 50\/50 applies|The recovery group is assigned/);
});

test("Poky map does not substitute paying-only or marginal data for missing joint cohorts", () => {
  const flow = appExperimentFlow("poky")!;
  const missing = currentCohortMetrics(flow.nodes, flow.edges, [experiment("poky-app-experience", "appu", [
    variant("new_experience", { users: 10, proceeds: 249.4 }),
  ])]);
  assert.ok([...missing.values()].every((metric) => metric.appu == null && !metric.isBest));
  const partial = currentCohortMetrics(flow.nodes, flow.edges, [experiment("poky-onboarding-abcd", "appu", [
    variant("extra_chat", { installs: 10, proceeds: 100 }),
  ])]);
  assert.equal(partial.get("background-new_experience")!.appu, null);
  assert.equal(partial.get("background-new_experience-control")!.appu, 10);
  assert.equal(partial.get("background-new_experience-control")!.isBest, false);
});

test("Poky weighted map uses the selected language's joint cohorts", () => {
  const cohorts = experiment("poky-onboarding-abcd", "appu", [
    variant("extra_chat", { installs: 10, proceeds: 1000 }), variant("intro_chat", { installs: 10, proceeds: 1000 }),
  ]);
  cohorts.languageVariants = { en: [
    variant("extra_chat", { installs: 30, proceeds: 30 }), variant("intro_chat", { installs: 10, proceeds: 30 }),
    variant("extra_original", { installs: 5, proceeds: 0 }), variant("intro_original", { installs: 5, proceeds: 0 }),
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
  assert.equal(english.edges.filter((edge) => edge.to === "cancel").length, 2);

  const spanish = appExperimentFlow("poky", "es")!;
  const spanishPaywalls = spanish.nodes.filter((node) => node.paywallMetric);
  assert.deepEqual(spanishPaywalls.map((node) => node.id), ["name-2-es"]);
  assert.equal(spanishPaywalls[0].paywallMetric?.language, "es");
});

test("the map language picker scopes every experiment APPU to the selected audience", () => {
  const localized = experiment("glow-onboarding-copy", "appu", [
    variant("iam", { installs: 10, proceeds: 90 }),
    variant("copy", { installs: 10, proceeds: 80 }),
  ]);
  localized.languageVariants = {
    en: [variant("iam", { installs: 10, proceeds: 1 }), variant("copy", { installs: 10, proceeds: 2 })],
    es: [variant("iam", { installs: 10, proceeds: 3 }), variant("copy", { installs: 10, proceeds: 4 })],
  };
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, {
    appId: "glow",
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

test("Poky branches through background, four plan combinations and all paywalls before conditional recovery", () => {
  const flow = appExperimentFlow("poky")!;
  const plans = flow.nodes.filter((node) => node.cohortMetric?.variants.length === 1);
  assert.equal(plans.length, 4);
  for (const plan of plans) {
    assert.ok(flow.edges.some((edge) => edge.to === plan.id && edge.label === "50%"));
    assert.ok(flow.edges.some((edge) => edge.from === plan.id && edge.to === "language"));
  }
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "language").map((edge) => edge.label), ["50%", "50%", "100%", "100%", "100%"]);
  const triggers = flow.edges.filter((edge) => edge.to === "cancel");
  assert.equal(triggers.length, 5);
  assert.ok(triggers.every((edge) => edge.conditional && edge.label === undefined));
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "cancel").map((edge) => edge.label), ["50%", "50%"]);
});

test("Glow shares all five paywalls after either onboarding flow without clipping nodes", () => {
  const flow = appExperimentFlow("glow")!;
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "start").map((edge) => edge.label), ["50%", "50%"]);
  assert.equal(flow.edges.filter((edge) => edge.to === "placements").length, 2);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "placements").map((edge) => edge.label), ["~17%", "~17%", "~17%", "25%", "25%"]);
  assert.ok(flow.nodes.every((node) => node.y + 40 < flow.height));
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "home").map((edge) => [edge.to, edge.label]), [["home-journal", "30%"], ["home-practice", "70%"]]);
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
