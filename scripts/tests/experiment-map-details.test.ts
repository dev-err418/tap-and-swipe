import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppExperimentMap, { currentCohortMetrics, currentPaywallMetrics } from "../../components/analytics/AppExperimentMap";
import ExperimentMapDetails from "../../components/analytics/ExperimentMapDetails";
import { appExperimentFlow } from "../../lib/app-experiment-flow";
import { experimentMapBranchSummary, experimentMapDetailTarget, experimentMapPaywallGroup, experimentMapRecoveryGroup } from "../../lib/experiment-map-details";
import type { NativePaywallGroup, NativePaywallReport } from "../../lib/native-paywall-analytics";
import { NATIVE_PAYWALL_DEMO_REPORT } from "../../lib/native-paywall-demo";
import type { MobileAppExperiment, MobileAppExperimentVariant } from "../../lib/mobile-app-analytics";
import { buildGlowOnboardingReport, GLOW_ONBOARDING_ID } from "../../lib/glow-onboarding-experience";

test("test cards open comparisons while the fixed Practice destination is non-interactive", () => {
  for (const app of ["glow", "poky"]) {
    for (const language of ["en", "es", "de", "fr"]) {
      const flow = appExperimentFlow(app, language)!;
      for (const node of flow.nodes) {
        const target = experimentMapDetailTarget(node, language);
        if (node.kind === "start" || (app === "glow" && node.id === "home")) assert.equal(target, null);
        else assert.ok(target, `${app}/${node.id}`);
      }
    }
    const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: app }));
    assert.equal(markup.match(/aria-haspopup="dialog"/g)?.length, appExperimentFlow(app)!.nodes.filter((node) => experimentMapDetailTarget(node)).length);
    assert.match(markup, /role="button" tabindex="0"/);
  }
});

test("paywall detail lookup keeps the chosen language and experiment version", () => {
  const node = appExperimentFlow("glow")!.nodes.find((node) => node.id === "yr_49")!;
  const en = experimentMapPaywallGroup(node, NATIVE_PAYWALL_DEMO_REPORT, "en")!;
  const es = experimentMapPaywallGroup(node, NATIVE_PAYWALL_DEMO_REPORT, "es")!;
  assert.equal(en.language, "en");
  assert.equal(es.language, "es");
  assert.notEqual(en, es);
  assert.equal(en.experiment, node.paywallMetric!.experiment);
  assert.equal(experimentMapPaywallGroup(node, { ...NATIVE_PAYWALL_DEMO_REPORT, status: "unavailable" }, "en"), null);
  assert.equal(experimentMapPaywallGroup(node, { ...NATIVE_PAYWALL_DEMO_REPORT, groups: [es] }, "en"), null);
});

test("branch summaries agree with weighted map APPU and reject incomplete cohorts", () => {
  const flow = appExperimentFlow("poky", "en")!;
  const node = flow.nodes.find((node) => node.id === "intro-animated_plan")!;
  const experiment: MobileAppExperiment = {
    id: "poky-plan-design-combinations", title: "Combined onboarding", subtitle: "", scoreMetrics: ["appu_d7"],
    variants: [variant("animated_plan_a", 90, 270), variant("animated_plan_b", 10, 60)],
  };
  const summary = experimentMapBranchSummary(node, experiment)!;
  const map = currentCohortMetrics(flow.nodes, flow.edges, [experiment]).get(node.id)!;
  assert.deepEqual(summary, { users: 100, proceeds: 330, appu: 3.3 });
  assert.equal(summary.appu, map.appu);
  assert.equal(experimentMapBranchSummary(node, { ...experiment, variants: experiment.variants.slice(0, 1) }), null);
  assert.equal(experimentMapBranchSummary(node, { ...experiment, paidUsersOnly: true }), null);
  const html = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "en", experiments: [experiment], nativePaywalls: null,
  }));
  assert.doesNotMatch(html, /<dl/);
  assert.match(html, /Combined onboarding/);
  assert.doesNotMatch(html, /APPU D7/);
});

test("Glow map ends at Practice with no retired Journal comparison or detail dialog", () => {
  const flow = appExperimentFlow("glow")!;
  const node = flow.nodes.find((node) => node.id === "home")!;
  assert.equal(node.label, "Practice");
  assert.equal(node.detail, "Everyone");
  assert.equal(experimentMapDetailTarget(node, "es"), null);
  assert.ok(!flow.nodes.some((node) => node.id === "home-journal" || node.id === "home-practice"));
  const html = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "glow" }));
  assert.match(html, /Practice/);
  assert.doesNotMatch(html, /Journal VS Practice|Home button|home-journal|home-practice/);
});

test("missing paywall and experiment results show an empty state instead of another audience", () => {
  const node = appExperimentFlow("glow")!.nodes.find((node) => node.id === "yr_49")!;
  const html = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "fr", experiments: [], nativePaywalls: { ...NATIVE_PAYWALL_DEMO_REPORT, groups: [] },
  }));
  assert.match(html, /No results for this test and language/);
  assert.doesNotMatch(html, /<table/);
});

test("Glow experience cards open the new comparison with an all-language audience", () => {
  const node = appExperimentFlow("glow")!.nodes.find((node) => node.id === "mascot_free")!;
  assert.deepEqual(experimentMapDetailTarget(node, "es"), { kind: "experiment", experimentId: GLOW_ONBOARDING_ID, language: "all" });
  const html = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "es", experiments: [], nativePaywalls: null,
    onboardingExperience: buildGlowOnboardingReport([], [], 0, Date.now(), Date.now()),
  }));
  assert.match(html, /Onboarding experience/);
  assert.match(html, /Avg time to cancel/);
  assert.doesNotMatch(html, /No results for this test and language/);
});

function variant(key: string, installs: number, proceeds: number): MobileAppExperimentVariant {
  return { key, label: key, countries: {}, users: installs, installs, proceeds, sessions: 0, completed: 0, trials: 0, converted: 0, paid: 5,
    installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0,
    installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0,
    installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 };
}

test("recovery map and modal use only the nonrandomized v3 rollout", () => {
  const current = recoveryGroup(3, "es");
  const legacy = recoveryGroup(2, "es");
  const report: NativePaywallReport = { status: "ready", asOf: Date.now(), warnings: [], groups: [legacy, current] };
  const flow = appExperimentFlow("poky", "es")!;
  const node = flow.nodes.find((node) => node.id === "recovery")!;
  assert.ok(!flow.nodes.some((node) => node.id === "holdout"));
  const metrics = currentPaywallMetrics(flow.nodes, report, "es").get("recovery")!;
  assert.equal(metrics.appu, 43.88 / 52);
  assert.equal(metrics.conversionRate, 5 / 49);
  assert.equal(metrics.isBest, false);
  assert.equal(experimentMapPaywallGroup(node, report, "es"), current);
  const detail = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "es", experiments: [], nativePaywalls: report,
  }));
  assert.match(detail, /Recovery · all non-trial users/);
  assert.doesNotMatch(detail, /Regular flow vs recovery|No recovery/);
});

test("recovery rollout never substitutes historical cohorts or another language", () => {
  const legacy = recoveryGroup(2, "es");
  const current = recoveryGroup(3, "es");
  const report: NativePaywallReport = { status: "ready", asOf: Date.now(), warnings: [], groups: [legacy, current, recoveryGroup(3, "en")] };
  assert.equal(experimentMapRecoveryGroup(report, "es"), current);
  assert.equal(experimentMapRecoveryGroup(report, "fr"), null);
  assert.equal(experimentMapRecoveryGroup({ ...report, status: "unavailable" }, "es"), null);
  assert.equal(experimentMapRecoveryGroup({ ...report, groups: [legacy] }, "es"), null);
  const flow = appExperimentFlow("poky", "es")!;
  assert.equal(currentPaywallMetrics(flow.nodes, { ...report, groups: [legacy] }, "es").get("recovery")!.appu, null);
});

function recoveryGroup(version: 2 | 3, language: string): NativePaywallGroup {
  const base = NATIVE_PAYWALL_DEMO_REPORT.groups[0].paywalls[0];
  return {
    experiment: `poky_native_recovery_v${version}_${language}`, language,
    name: version === 3 ? "Recovery · all non-trial users" : "Regular flow vs recovery · retired 50/50",
    placements: [],
    paywalls: [{ ...base, id: "recovery|recovery", paywall: "recovery", label: "Recovery", users: 52, views: 49, conversions: 5, proceeds: 43.88 }],
  };
}
