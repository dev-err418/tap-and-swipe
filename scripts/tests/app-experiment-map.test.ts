import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppExperimentMap from "../../components/analytics/AppExperimentMap";
import { appExperimentMap } from "../../lib/app-experiment-map";
import { appExperimentFlow } from "../../lib/app-experiment-flow";
import { nativePaywallAllocation } from "../../lib/native-paywall-allocation";

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
  assert.match(map.tests.find((row) => row.id === "poky-recovery-holdout")!.scope, /any origin placement/);
});

test("unsupported apps do not show invented experiments", () => {
  assert.equal(appExperimentMap("versy"), null);
  assert.equal(appExperimentMap("unknown"), null);
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
