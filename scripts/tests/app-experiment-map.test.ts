import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppExperimentMap, { currentBestVariants, currentPaywallMetrics } from "../../components/analytics/AppExperimentMap";
import { activeABTestCount, appExperimentMap } from "../../lib/app-experiment-map";
import { appExperimentFlow } from "../../lib/app-experiment-flow";
import type { MobileAppExperiment, MobileAppExperimentVariant } from "../../lib/mobile-app-analytics";
import { NATIVE_PAYWALL_DEMO_REPORT } from "../../lib/native-paywall-demo";
import { nativePaywallAllocation } from "../../lib/native-paywall-allocation";
import { orderAppExperiments } from "../../lib/app-experiment-order";

test("every configured audience has a complete, valid allocation", () => {
  for (const app of ["glow", "poky"]) {
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

test("Glow includes only current onboarding and paywall assignments, not historical comparisons", () => {
  const map = appExperimentMap("glow")!;
  assert.deepEqual(map.tests.map((experiment) => experiment.id), ["glow-onboarding-copy", "native_paywalls_v2"]);
  assert.deepEqual(map.tests[0].branches.map((branch) => branch.percent), [50, 50]);
  assert.deepEqual(map.tests[1].branches.map((branch) => branch.percent), [25, 25, 50]);
  for (const branch of map.tests[1].branches) {
    assert.equal(branch.percent, nativePaywallAllocation("native_paywalls_v2", branch.id, branch.id));
  }
});

test("Poky shows independent 50/50 tests, four 25% combinations, and localized single offers", () => {
  const map = appExperimentMap("poky")!;
  for (const experiment of map.tests.filter((row) => row.id !== "poky-localized-paywalls")) {
    assert.deepEqual(experiment.branches.map((branch) => branch.percent), [50, 50]);
  }
  assert.deepEqual(map.tests.find((row) => row.id === "poky-localized-paywalls")?.branches.map((branch) => branch.percent), [100]);
  assert.deepEqual(map.combinations?.map((branch) => branch.percent), [25, 25, 25, 25]);
  assert.match(map.tests.find((row) => row.id === "poky-app-experience")!.scope, /next app release/);
  assert.match(map.tests.find((row) => row.id === "poky-native-recovery-holdout")!.scope, /any origin placement/);
});

test("unsupported apps do not show invented experiments", () => {
  assert.equal(appExperimentMap("versy"), null);
  assert.equal(appExperimentMap("unknown"), null);
});

test("active A/B counts exclude historical comparisons and single-offer allocations", () => {
  assert.equal(activeABTestCount("glow"), 2);
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

test("both maps render their percentage badges without analytics data", () => {
  for (const app of ["glow", "poky"]) {
    const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: app }));
    assert.match(markup, /Experiment map/);
    assert.match(markup, /Configured allocation/);
    assert.match(markup, /<svg/);
    assert.match(markup, />50%<\/text>/);
    assert.match(markup, /Start/);
    assert.match(markup, /onboarding/);
  }
  assert.equal(renderToStaticMarkup(createElement(AppExperimentMap, { appId: "versy" })), "");
});

test("the map marks the current leader at each non-paywall step", () => {
  const experiments: MobileAppExperiment[] = [
    experiment("poky-animated-plan", "appu_d7", [
      variant("control", { installsD7: 100, proceedsD7: 20 }),
      variant("animated_plan", { installsD7: 100, proceedsD7: 30 }),
    ]),
    experiment("poky-app-experience", "sessions_per_day", [
      variant("control", { users: 100, sessions: 200 }),
      variant("new_experience", { users: 100, sessions: 250 }),
    ]),
    experiment("poky-native-recovery-holdout", "appu", [
      variant("holdout", { installs: 100, proceeds: 10 }),
      variant("recovery", { installs: 100, proceeds: 20 }),
    ]),
  ];

  assert.deepEqual([...currentBestVariants(experiments)], [
    ["poky-animated-plan", "animated_plan"],
    ["poky-app-experience", "new_experience"],
    ["poky-native-recovery-holdout", "recovery"],
  ]);
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "poky", experiments }));
  assert.doesNotMatch(markup, />BEST<\/text>/);
  assert.equal(markup.match(/% conf/g)?.length, 4);
  assert.equal(markup.match(/% better/g)?.length, 4);
  assert.match(markup, /stroke-width="3"/);
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

test("paywall variants use compact APPU/CR cards and highlight the unique APPU leader", () => {
  const flow = appExperimentFlow("glow")!;
  const metrics = currentPaywallMetrics(flow.nodes, NATIVE_PAYWALL_DEMO_REPORT);
  assert.equal(metrics.size, 3);
  assert.ok([...metrics.values()].every((metric) => metric.appu != null && metric.conversionRate != null));

  const markup = renderToStaticMarkup(createElement(AppExperimentMap, {
    appId: "glow",
    nativePaywalls: NATIVE_PAYWALL_DEMO_REPORT,
  }));
  assert.equal(markup.match(/APPU \$/g)?.length, 3);
  assert.equal(markup.match(/ · CR /g)?.length, 3);
  assert.match(markup, /fill="#e5ebff"/);
  assert.match(markup, /stroke-width="3"/);
  assert.doesNotMatch(markup, /height="68"/);
  assert.doesNotMatch(markup, /% conf/);
});

test("flows have one onboarding origin, valid left-to-right edges and no disconnected nodes", () => {
  for (const app of ["glow", "poky"]) {
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
  assert.equal(appExperimentFlow("versy"), null);
});

test("Poky branches through background, four plan combinations and all paywalls before conditional recovery", () => {
  const flow = appExperimentFlow("poky")!;
  const plans = flow.nodes.filter((node) => node.detail === "25% of new assignments");
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

test("Glow shares the same three paywalls after either onboarding flow", () => {
  const flow = appExperimentFlow("glow")!;
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "start").map((edge) => edge.label), ["50%", "50%"]);
  assert.equal(flow.edges.filter((edge) => edge.to === "placements").length, 2);
  assert.deepEqual(flow.edges.filter((edge) => edge.from === "placements").map((edge) => edge.label), ["25%", "25%", "50%"]);
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
