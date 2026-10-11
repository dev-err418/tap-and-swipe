import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GlowYearlyPricePanel from "../../components/analytics/GlowYearlyPricePanel";
import { NATIVE_PAYWALL_DEMO_REPORT, YEARLY_PRICE_DEMO_REPORT } from "../../lib/native-paywall-demo";

test("yearly price results use only the current all-language cohort", () => {
  const all = YEARLY_PRICE_DEMO_REPORT.groups.find((group) => group.language === "all")!;
  const report = { ...YEARLY_PRICE_DEMO_REPORT, groups: [
    ...NATIVE_PAYWALL_DEMO_REPORT.groups,
    ...YEARLY_PRICE_DEMO_REPORT.groups.filter((group) => group.language !== "all"),
    { ...all, paywalls: all.paywalls.map((row) => ({ ...row, users: 987654 })) },
  ] };
  const html = renderToStaticMarkup(createElement(GlowYearlyPricePanel, { report }));
  assert.match(html, /987,654/);
  assert.match(html, /Paid users/);
  assert.match(html, /Total APPU/);
  assert.match(html, /not a fourth price arm/);
  assert.doesNotMatch(html, /Annual \+ weekly layouts|yr_wk_/);
});

test("historical or language-only results cannot fill a missing current total", () => {
  for (const report of [NATIVE_PAYWALL_DEMO_REPORT, {
    ...YEARLY_PRICE_DEMO_REPORT, groups: YEARLY_PRICE_DEMO_REPORT.groups.filter((group) => group.language !== "all"),
  }]) {
    const html = renderToStaticMarkup(createElement(GlowYearlyPricePanel, { report }));
    assert.match(html, /No production assignments for the new yearly price test yet/);
    assert.doesNotMatch(html, /<table/);
  }
});

test("failed reports and data warnings are visible rather than shown as zero", () => {
  const unavailable = renderToStaticMarkup(createElement(GlowYearlyPricePanel, { report: null }));
  assert.match(unavailable, /Yearly price reporting is unavailable/);
  const warned = renderToStaticMarkup(createElement(GlowYearlyPricePanel, {
    report: { ...YEARLY_PRICE_DEMO_REPORT, warnings: ["Some transaction amounts are unavailable."] },
  }));
  assert.match(warned, /Some transaction amounts are unavailable/);
});
