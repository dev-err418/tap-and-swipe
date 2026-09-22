import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NativePaywallsPanel from "../../components/analytics/NativePaywallsPanel";
import { GLOW_PAYWALL_EXPERIMENT, formatPaywallAllocation, nativePaywallAllocation } from "../../lib/native-paywall-allocation";
import { NATIVE_PAYWALL_DEMO_REPORT } from "../../lib/native-paywall-demo";

test("every fixture audience mirrors all five v3 allocations", () => {
  for (const group of NATIVE_PAYWALL_DEMO_REPORT.groups) {
    const percentages = group.paywalls.map((row) => nativePaywallAllocation(group.experiment, row.id, row.paywall));
    assert.deepEqual(percentages, [100 / 6, 100 / 6, 100 / 6, 25, 25]);
    assert.equal(percentages.reduce<number>((sum, value) => sum + (value ?? 0), 0), 100);
    const totalUsers = group.paywalls.reduce((sum, row) => sum + row.users, 0);
    group.paywalls.forEach((row, i) => assert.ok(Math.abs(row.users / totalUsers * 100 - percentages[i]!) < 1e-9));
    assert.equal(group.paywalls.reduce((sum, row) => sum + (row.estimate.chanceBest ?? 0), 0), 1);
  }
});

test("v3 composite rows use exact equal yearly weights and readable percentage labels", () => {
  for (const { id, percent } of GLOW_PAYWALL_EXPERIMENT.variants) {
    assert.equal(nativePaywallAllocation("native_paywalls_v3", `${id}|${id}`, id), percent);
  }
  assert.equal(formatPaywallAllocation(100 / 6), "~17%");
  assert.equal(formatPaywallAllocation(25), "25%");
  assert.equal(nativePaywallAllocation("native_paywalls_v2", "yr_34", "yr_34"), null);
  assert.equal(nativePaywallAllocation("native_paywalls_v3", "yr_wk_34", "yr_wk_59"), null);
});

test("the live paywall panel shows next-release allocations even before data arrives", () => {
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "glow", report: null }));
  for (const { id } of GLOW_PAYWALL_EXPERIMENT.variants) assert.ok(markup.includes(id));
  assert.match(markup, /~17%/);
  assert.match(markup, /25%/);
  assert.match(markup, /needs Apple approval/);
  assert.doesNotMatch(markup, /166666/);
  const poky = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "poky", report: null }));
  assert.doesNotMatch(poky, /yr_wk_34/);
});

test("the paywall panel uses one total APPU metric without fixed-day windows", () => {
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "glow", report: NATIVE_PAYWALL_DEMO_REPORT }));
  assert.match(markup, /Total APPU/);
  assert.doesNotMatch(markup, /APPU window|Estimated APPU D7|Estimated APPU D14|Estimated APPU D30/);
});

test("unknown experiments, variants, paywalls and placements have no invented allocation", () => {
  assert.equal(nativePaywallAllocation("future_test", "annual", "native_timeline_annual_v1"), null);
  assert.equal(nativePaywallAllocation("native_yearly_v1", "third", "native_timeline_annual_v1"), null);
  assert.equal(nativePaywallAllocation("native_yearly_v1", "annual", "future_design"), null);
  assert.equal(nativePaywallAllocation("native_yearly_v1", "home_crown", ""), null);
});

test("live composite row IDs use v2 allocations and preserve historical v1 percentages", () => {
  assert.equal(nativePaywallAllocation("native_paywalls_v2", "yr_49|yr_49", "yr_49"), 25);
  assert.equal(nativePaywallAllocation("native_paywalls_v2", "yr_59|yr_59", "yr_59"), 25);
  assert.equal(nativePaywallAllocation("native_paywalls_v2", "yr_wk_59|yr_wk_59", "yr_wk_59"), 50);
  assert.equal(nativePaywallAllocation("native_yearly_v1", "annual", "native_timeline_annual_v1"), 50);
  assert.equal(nativePaywallAllocation("native_yearly_v1", "pro_yearly", "native_timeline_pro_yearly_v1"), 50);
  assert.equal(nativePaywallAllocation("native_yearly_v1", "new_paywall", "native_new_paywall_preview"), null);
});

test("Poky mirrors its language-specific main and recovery allocations", () => {
  assert.equal(nativePaywallAllocation("poky_native_main_v1_en", "high", "high", "en"), 50);
  assert.equal(nativePaywallAllocation("poky_native_main_v1_en", "name", "name", "en"), 50);
  assert.equal(nativePaywallAllocation("poky_native_main_v1_de", "name", "name", "de"), 100);
  assert.equal(nativePaywallAllocation("poky_native_main_v1_es", "name", "name", "es"), 100);
  assert.equal(nativePaywallAllocation("poky_native_main_v1_fr", "name", "name", "fr"), 100);
  assert.equal(nativePaywallAllocation("poky_native_recovery_v1_en", "recovery", "recovery", "en"), 50);
  assert.equal(nativePaywallAllocation("poky_native_recovery_v1_en", "holdout", "holdout", "en"), 50);
  assert.equal(nativePaywallAllocation("poky_context_recovery_v1_fr", "recovery", "recovery", "fr"), 100);
  assert.equal(nativePaywallAllocation("poky_native_main_v1_en", "high", "high", "fr"), null);
});
