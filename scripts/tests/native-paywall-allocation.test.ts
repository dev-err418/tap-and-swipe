import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NativePaywallsPanel from "../../components/analytics/NativePaywallsPanel";
import { GLOW_PAYWALL_EXPERIMENT, GLOW_YEARLY_PRICE_EXPERIMENT, formatPaywallAllocation, glowYearlyPrice, nativePaywallAllocation } from "../../lib/native-paywall-allocation";
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

test("the live paywall panel shows the new equal six-arm price/trial allocation", () => {
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "glow", report: null }));
  for (const price of ["$34.99/year", "$49.99/year", "$59.99/year"]) assert.ok(markup.includes(price));
  assert.equal((markup.match(/~17%/g) ?? []).length, 6);
  assert.doesNotMatch(markup, /166666/);
  assert.match(markup, /Glow yearly price comparison/);
  assert.match(markup, /next Glow app build assigns three yearly prices with either a 3-day or 7-day trial/);
  assert.match(markup, /never mixed into this price\/trial comparison/);
  const poky = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "poky", report: null }));
  assert.doesNotMatch(poky, /yr_wk_34/);
});

test("v5 allocates one sixth to each price/trial combination and leaves history untouched", () => {
  const allocations = GLOW_YEARLY_PRICE_EXPERIMENT.variants.map(({ id }) =>
    nativePaywallAllocation(GLOW_YEARLY_PRICE_EXPERIMENT.id, `${id}|${id}`, id));
  assert.deepEqual(allocations, Array(6).fill(100 / 6));
  assert.ok(Math.abs(allocations.reduce<number>((sum, value) => sum + (value ?? 0), 0) - 100) < 1e-9);
  assert.equal(nativePaywallAllocation("native_yearly_prices_v4", "yr_34", "yr_34"), 100 / 3);
  assert.equal(nativePaywallAllocation(GLOW_YEARLY_PRICE_EXPERIMENT.id, "yr_wk_34|yr_wk_34", "yr_wk_34"), null);
  assert.equal(nativePaywallAllocation(GLOW_PAYWALL_EXPERIMENT.id, "yr_wk_34|yr_wk_34", "yr_wk_34"), 25);
});

test("annual-only prices are exact and weekly layouts cannot enter the price comparison", () => {
  assert.equal(glowYearlyPrice("yr_34|yr_34", "yr_34"), "$34.99/year (7d)");
  assert.equal(glowYearlyPrice("yr_49", "yr_49"), "$49.99/year (7d)");
  assert.equal(glowYearlyPrice("yr_59|yr_59", "yr_59"), "$59.99/year (7d)");
  assert.equal(glowYearlyPrice("yr_wk_59|yr_wk_59", "yr_wk_59"), null);
  assert.equal(glowYearlyPrice("yr_34|yr_34", "yr_wk_34"), null);
});

test("the temporary US yearly cohort is labeled as observational with no allocation badge or winner estimate", () => {
  const report = {
    ...NATIVE_PAYWALL_DEMO_REPORT,
    groups: [{
      ...NATIVE_PAYWALL_DEMO_REPORT.groups.find((group) => group.language === "en")!,
      experiment: "native_paywall_us_yearly_oct2026",
      name: "US yearly-only through October 11",
      paywalls: NATIVE_PAYWALL_DEMO_REPORT.groups.find((group) => group.language === "en")!.paywalls.slice(0, 3),
      placements: [],
    }],
  };
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "glow", report }));
  assert.match(markup, /do not treat this as a randomized three-price test/);
  assert.match(markup, /\$34\.99\/year/);
  assert.doesNotMatch(markup, /configured allocation|chance to win/);
});

test("the temporary English presentation is a separate single-offer experiment", () => {
  assert.equal(nativePaywallAllocation("native_paywall_legacy_en_sep2026", "yr_59|yr_59", "yr_59", "en"), 100);
  assert.equal(nativePaywallAllocation("native_paywall_legacy_en_sep2026", "yr_59", "yr_59", "es"), null);
});

test("the paywall panel uses one total APPU metric without fixed-day windows", () => {
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "glow", report: NATIVE_PAYWALL_DEMO_REPORT }));
  assert.match(markup, /Total APPU/);
  assert.match(markup, /Yearly prices/);
  assert.match(markup, /Other paywall layouts in this five-variant test/);
  assert.equal((markup.match(/Probability best/g) ?? []).length, 1); // Placements retain their existing columns.
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


test("Poky recovery v3 is 100% without relabelling the retired holdout split", () => {
  for (const language of ["en", "es", "de", "fr"]) {
    assert.equal(nativePaywallAllocation(`poky_native_recovery_v3_${language}`, "recovery|recovery", "recovery"), 100);
    assert.equal(nativePaywallAllocation(`poky_native_recovery_v3_${language}`, "holdout|holdout", "holdout"), null);
    assert.equal(nativePaywallAllocation(`poky_native_recovery_v2_${language}`, "holdout|holdout", "holdout"), 50);
  }
});
