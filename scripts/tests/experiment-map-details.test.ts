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
import { buildJournalPracticeReport } from "../../lib/journal-practice-analytics";

test("every map card opens a relevant test, including structural cards", () => {
  for (const app of ["glow", "poky"]) {
    for (const language of ["en", "es", "de", "fr"]) {
      const flow = appExperimentFlow(app, language)!;
      for (const node of flow.nodes) {
        const target = experimentMapDetailTarget(node, language);
        if (node.kind === "start") assert.equal(target, null);
        else assert.ok(target, `${app}/${node.id}`);
      }
    }
    const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: app }));
    assert.equal(markup.match(/aria-haspopup="dialog"/g)?.length, appExperimentFlow(app)!.nodes.length - 1);
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
  const node = flow.nodes.find((node) => node.id === "background-new_experience")!;
  const experiment: MobileAppExperiment = {
    id: "poky-onboarding-abcd", title: "Combined onboarding", subtitle: "", scoreMetrics: ["appu_d7"],
    variants: [variant("extra_chat", 90, 270), variant("intro_chat", 10, 60)],
  };
  const summary = experimentMapBranchSummary(node, experiment)!;
  const map = currentCohortMetrics(flow.nodes, flow.edges, [experiment]).get(node.id)!;
  assert.deepEqual(summary, { users: 100, proceeds: 330, appu: 3.3 });
  assert.equal(summary.appu, map.appu);
  assert.equal(experimentMapBranchSummary(node, { ...experiment, variants: experiment.variants.slice(0, 1) }), null);
  assert.equal(experimentMapBranchSummary(node, { ...experiment, paidUsersOnly: true }), null);
  const html = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "en", experiments: [experiment], nativePaywalls: null, journalPractice: null,
  }));
  assert.doesNotMatch(html, /<dl/);
  assert.match(html, /Combined onboarding/);
  assert.doesNotMatch(html, /APPU D7/);
});

test("journal cards open the activity comparison labelled all languages, with no D30 return", () => {
  const node = appExperimentFlow("glow")!.nodes.find((node) => node.id === "home-practice")!;
  assert.deepEqual(experimentMapDetailTarget(node, "es"), {
    kind: "journal", experimentId: "journal_vs_practice_v1", language: "all",
  });
  const html = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "es", experiments: [], nativePaywalls: null,
    journalPractice: buildJournalPracticeReport([], 0, Date.now(), Date.now()),
  }));
  assert.match(html, /Journal VS Practice/);
  assert.match(html, /D1 return/);
  assert.doesNotMatch(html, /D30 return|APPU/);
});

test("missing paywall and experiment results show an empty state instead of another audience", () => {
  const node = appExperimentFlow("glow")!.nodes.find((node) => node.id === "yr_49")!;
  const html = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node, language: "fr", experiments: [], nativePaywalls: { ...NATIVE_PAYWALL_DEMO_REPORT, groups: [] }, journalPractice: null,
  }));
  assert.match(html, /No results for this test and language/);
  assert.doesNotMatch(html, /<table/);
});

function variant(key: string, installs: number, proceeds: number): MobileAppExperimentVariant {
  return { key, label: key, countries: {}, users: installs, installs, proceeds, sessions: 0, completed: 0, trials: 0, converted: 0, paid: 5,
    installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0,
    installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0,
    installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 };
}

test("recovery map and modal reuse Paywalls proceeds and assigned-user CR even with zero holdout views", () => {
  const legacy = recoveryGroup(1, "es");
  const report: NativePaywallReport = { status: "ready", asOf: Date.now(), warnings: [], groups: [legacy] };
  const flow = appExperimentFlow("poky", "es")!;
  const holdout = flow.nodes.find((node) => node.id === "holdout")!;
  const metrics = currentPaywallMetrics(flow.nodes, report, "es");
  assert.equal(metrics.get("holdout")!.appu, 58.63 / 60);
  assert.equal(metrics.get("holdout")!.conversionRate, 6 / 60);
  assert.equal(metrics.get("holdout")!.isBest, true);
  assert.equal(metrics.get("recovery")!.appu, 43.88 / 52);
  assert.equal(metrics.get("recovery")!.conversionRate, 5 / 52);
  assert.equal(experimentMapPaywallGroup(holdout, report, "es"), legacy);
  const markup = renderToStaticMarkup(createElement(AppExperimentMap, { appId: "poky", nativePaywalls: report }));
  assert.match(markup, /APPU \$0\.98 · CR 10%/);
  assert.match(markup, /Recovery · legacy cohort/);
  const detail = renderToStaticMarkup(createElement(ExperimentMapDetails, {
    node: holdout, language: "es", experiments: [], nativePaywalls: report, journalPractice: null,
  }));
  assert.match(detail, /58\.63/);
  assert.match(detail, /legacy/);
});

test("recovery chooses enrolled v2 as a separate cohort, never sums v1 or another language", () => {
  const legacy = recoveryGroup(1, "es");
  const current = recoveryGroup(2, "es");
  current.paywalls = current.paywalls.map((row) => ({ ...row, users: 1, proceeds: row.paywall === "holdout" ? 20 : 10 }));
  const report: NativePaywallReport = { status: "ready", asOf: Date.now(), warnings: [], groups: [legacy, current, recoveryGroup(1, "en")] };
  const flow = appExperimentFlow("poky", "es")!;
  assert.equal(experimentMapRecoveryGroup(report, "es"), current);
  assert.equal(currentPaywallMetrics(flow.nodes, report, "es").get("holdout")!.appu, 20);
  assert.equal(experimentMapRecoveryGroup(report, "fr"), null);
  assert.equal(experimentMapRecoveryGroup({ ...report, status: "unavailable" }, "es"), null);
  assert.equal(experimentMapRecoveryGroup({ ...report, groups: [legacy, { ...current, paywalls: [] }] }, "es"), legacy);
});

function recoveryGroup(version: 1 | 2, language: string): NativePaywallGroup {
  const base = NATIVE_PAYWALL_DEMO_REPORT.groups[0].paywalls[0];
  return {
    experiment: `poky_native_recovery_v${version}_${language}`, language,
    name: version === 1 ? "Recovery after cancellation · legacy 50/50" : "Regular flow vs recovery · 50/50",
    outcomeScope: version === 1 ? "recovery_eligibility" : "recovery_flow", placements: [],
    paywalls: [
      { ...base, id: "holdout|holdout", paywall: "holdout", label: "Regular flow", users: 60, views: 0, conversions: 6, proceeds: 58.63 },
      { ...base, id: "recovery|recovery", paywall: "recovery", label: "Regular flow + recovery", users: 52, views: 49, conversions: 5, proceeds: 43.88 },
    ],
  };
}
