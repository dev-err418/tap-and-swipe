import assert from "node:assert/strict";
import test from "node:test";
import { nativePaywallAllocation } from "../../lib/native-paywall-allocation";
import { NATIVE_PAYWALL_DEMO_REPORT } from "../../lib/native-paywall-demo";

test("every preview audience shows the requested 25/25/50 allocation", () => {
  for (const group of NATIVE_PAYWALL_DEMO_REPORT.groups) {
    const percentages = group.paywalls.map((row) => nativePaywallAllocation(group.experiment, row.id, row.paywall));
    assert.deepEqual(percentages, [25, 25, 50]);
    assert.equal(percentages.reduce<number>((sum, value) => sum + (value ?? 0), 0), 100);
    const totalUsers = group.paywalls.reduce((sum, row) => sum + row.users, 0);
    assert.deepEqual(group.paywalls.map((row) => row.users / totalUsers * 100), [25, 25, 50]);
    for (const horizon of [7, 14, 30] as const) {
      assert.equal(group.paywalls.reduce((sum, row) => sum + (row.estimates[horizon].chanceBest ?? 0), 0), 1);
    }
  }
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
