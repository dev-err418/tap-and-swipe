import assert from "node:assert/strict";
import test from "node:test";
import { buildNativePaywallReport, type PaywallAttribute, type PaywallRecord, type PaywallRevenue, type PaywallPurchase } from "../../lib/native-paywall-analytics";
import { loadNativePaywalls } from "../../lib/native-paywall-queries";

const DAY = 86400000;
const start = Date.parse("2026-09-01T00:00:00Z");
const iso = (days: number) => new Date(start + days * DAY).toISOString();
const record = (overrides: Partial<PaywallRecord> = {}): PaywallRecord => ({ schema: 1, environment: "production", experiment: "price_v1", experimentName: "Price test", variant: "a", variantName: "A", paywall: "native_a", language: "en", assignedAt: start, randomized: true, variantCount: 2, expectedProduct: "annual", ...overrides });
const attribute = (owner: string, key: string, value: unknown): PaywallAttribute => ({ appUserId: owner, key, value: JSON.stringify(value) });
function fixture(owner: string, overrides: Partial<PaywallRecord> = {}, tx = "100", placement = "themes_upgrade") {
  const a = record({ viewedAt: start + DAY, ...overrides });
  const p = { ...a, placement, reachedAt: start + DAY };
  const purchase: PaywallPurchase = { context: p, productID: "annual", startedAt: start + 2 * DAY, purchasedAt: start + 2 * DAY, transactionID: tx, originalTransactionID: tx };
  return [attribute(owner, "gp1_a_price_v1", a), attribute(owner, `gp1_p_price_v1__${placement}`, p), attribute(owner, `gp1_t_${tx}`, purchase)];
}
const money = (overrides: Partial<PaywallRevenue> = {}): PaywallRevenue => ({ id: "charge", name: "initial_purchase", originalTransactionId: "100", transactionId: "100", isRefund: 0, price: 10, proceeds: 8.5, ts: iso(2), purchasedAt: iso(2), attributionTs: iso(2), ...overrides });
const report = (attrs: PaywallAttribute[], events: PaywallRevenue[]) => buildNativePaywallReport(attrs, events, start, start + DAY, start + 10 * DAY);

test("APPU includes non-viewers/non-payers; views are unique; language is frozen", () => {
  const attrs = [...fixture("u1"), attribute("u2", "gp1_a_price_v1", record()), ...fixture("u3", { language: "es" }, "200")];
  const result = report(attrs, [money()]);
  const all = result.groups.find((g) => g.language === "all")!.paywalls[0];
  assert.equal(all.users, 3);
  assert.equal(all.views, 2);
  assert.equal(all.conversions, 2); // Verified purchases include trials / pending server delivery.
  assert.equal(all.paid, 1);
  assert.equal(all.proceeds, 8.5);
  assert.equal(all.estimates[7].appu, 8.5 / 3);
  assert.equal(result.groups.find((g) => g.language === "es")!.paywalls[0].users, 1);
});

test("renewals and cancellation refunds stay on the originating placement and deduplicate", () => {
  const attrs = [...fixture("u1"), attribute("u1", "gp1_p_price_v1__settings_upgrade", record({ placement: "settings_upgrade", reachedAt: start + 4 * DAY, viewedAt: start + 4 * DAY }))];
  const renewal = money({ id: "renewal", name: "renewal", transactionId: "101", ts: iso(5), purchasedAt: iso(5), attributionTs: iso(5) });
  const refund = money({ id: "refund", name: "cancellation", transactionId: "101", isRefund: 1, ts: iso(6), purchasedAt: iso(5), attributionTs: iso(6) });
  const result = report(attrs, [money(), renewal, { ...renewal, id: "duplicate", attributionTs: iso(6) }, refund]);
  const group = result.groups.find((g) => g.language === "all")!;
  const row = group.paywalls[0];
  assert.equal(row.proceeds, 8.5);
  assert.equal(row.grossRevenue, 20);
  assert.equal(row.refunds, 10);
  assert.equal(row.refunds / row.grossRevenue, 0.5);
  assert.equal(row.conversions, 1);
  assert.equal(group.placements.find((p) => p.id === "themes_upgrade")!.proceeds, 8.5);
  assert.equal(group.placements.find((p) => p.id === "settings_upgrade")!.proceeds, 0);
  assert.equal(group.placements[0].estimates[7].chanceBest, null);
});

test("refund of an older charge does not move to a later resubscription", () => {
  const attrs = fixture("u1");
  const p = JSON.parse(attrs[2].value) as PaywallPurchase;
  const context = { ...p.context, placement: "settings_upgrade", reachedAt: start + 4 * DAY, viewedAt: start + 4 * DAY };
  const newer: PaywallPurchase = { ...p, context, transactionID: "102", startedAt: start + 4 * DAY, purchasedAt: start + 4 * DAY };
  attrs.push(attribute("u1", "gp1_p_price_v1__settings_upgrade", context), attribute("u1", "gp1_t_102", newer));
  const result = report(attrs, [money(), money({ id: "refund", name: "cancellation", isRefund: 1, ts: iso(6), attributionTs: iso(6) })]);
  const group = result.groups.find((g) => g.language === "all")!;
  assert.equal(group.placements.find((r) => r.id === "themes_upgrade")!.refunds, 10);
  assert.equal(group.placements.find((r) => r.id === "settings_upgrade")!.refunds, 0);
});

test("cohort filter and fixed-age estimates exclude immature users and later money", () => {
  const result = report([...fixture("u1"), ...fixture("u2", { assignedAt: start - DAY }, "200")], [money(), money({ id: "later", name: "renewal", transactionId: "101", ts: iso(9), purchasedAt: iso(9) })]);
  const row = result.groups.find((g) => g.language === "all")!.paywalls[0];
  assert.equal(row.users, 1);
  assert.equal(row.proceeds, 17);
  assert.equal(row.estimates[7].appu, 8.5);
  assert.equal(row.estimates[14].appu, null);
  assert.equal(row.estimates[14].users, 0);
});

test("malformed and development attributes never enter production results", () => {
  const result = report([...fixture("dev", { environment: "development" }), attribute("bad", "gp1_a_price_v1", { ...record(), assignedAt: "yesterday" })], []);
  assert.equal(result.groups.length, 0);
  assert.match(result.warnings[0], /1 malformed/);
});

test("probability uses mature per-user proceeds and is suppressed for inherited assignments", () => {
  const attrs: PaywallAttribute[] = [];
  const events: PaywallRevenue[] = [];
  for (const variant of ["a", "b"]) for (let i = 0; i < 60; i++) {
    const user = `${variant}${i}`;
    const tx = String((variant === "a" ? 1000 : 2000) + i);
    const f = fixture(user, { variant, variantName: variant, paywall: `native_${variant}` }, tx);
    attrs.push(...(i < 10 ? f : f.slice(0, 2)));
    if (i < 10) events.push(money({ id: tx, originalTransactionId: tx, transactionId: tx, price: variant === "a" ? 10 : 20, proceeds: variant === "a" ? 8.5 : 17 }));
  }
  const rows = report(attrs, events).groups.find((g) => g.language === "all")!.paywalls;
  assert.ok(rows[1].estimates[7].chanceBest! > 0.5);
  assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.estimates[7].chanceBest!, 0) - 1) < 1e-6);
  assert.ok(rows[1].estimates[7].relativeDelta! > 0);
  assert.ok(rows[1].estimates[7].credibleInterval![0] < rows[1].estimates[7].relativeDelta!);
  assert.ok(rows[1].estimates[7].credibleInterval![1] > rows[1].estimates[7].relativeDelta!);
  const a = JSON.parse(attrs[0].value); a.randomized = false; attrs[0].value = JSON.stringify(a);
  const suppressed = report(attrs, events).groups[0].paywalls[0].estimates[7];
  assert.equal(suppressed.chanceBest, null);
  assert.equal(suppressed.credibleInterval, null);
});

test("query failures are unavailable, never a misleading zero", async () => {
  const result = await loadNativePaywalls(async () => { throw new Error("test offline"); }, 54736, start, start + DAY);
  assert.equal(result.status, "unavailable");
  assert.equal(result.groups.length, 0);
});

test("v2 separates the same-SKU designs and Weekly is a valid package purchase", () => {
  const annual = "com.arthurbuildsstuff.glow.Annual";
  const pro = "com.arthurbuildsstuff.glow.pro.yearly";
  const weekly = "com.arthurbuildsstuff.glow.Weekly";
  const attrs: PaywallAttribute[] = [];
  const events: PaywallRevenue[] = [];
  for (const [index, variant] of ["yr_49", "yr_59", "yr_wk_59"].entries()) {
    for (let i = 0; i < 60; i++) {
      const owner = `${variant}_${i}`;
      const tx = String(1000 + index * 100 + i);
      const productID = index === 0 ? annual : index === 1 ? pro : weekly;
      const assignment = record({ experiment: "native_paywalls_v2", variant, variantName: variant, paywall: variant,
        variantCount: 3, expectedProduct: index === 0 ? annual : pro,
        allowedProducts: index === 0 ? [annual] : index === 1 ? [pro] : [pro, weekly],
        viewedAt: start + DAY, displayedProduct: productID });
      const placement = { ...assignment, placement: "themes_upgrade", reachedAt: start + DAY };
      attrs.push(attribute(owner, "gp1_a_native_paywalls_v2", assignment),
        attribute(owner, "gp1_p_native_paywalls_v2__themes_upgrade", placement));
      if (i < 10) {
        const purchase: PaywallPurchase = { context: placement, productID, transactionID: tx, originalTransactionID: tx,
          startedAt: start + 2 * DAY, purchasedAt: start + 2 * DAY };
        attrs.push(attribute(owner, `gp1_t_${tx}`, purchase));
        events.push(money({ id: tx, originalTransactionId: tx, transactionId: tx }));
      }
    }
  }
  // Historical data stays a separate experiment, not relabeled as v2.
  attrs.push(...fixture("historical", {}, "9999"));
  const result = report(attrs, events);
  assert.match(result.warnings[0], /1 verified purchases are awaiting/); // Historical purchase has no money yet.
  const group = result.groups.find((g) => g.language === "all" && g.experiment === "native_paywalls_v2")!;
  assert.equal(group.paywalls.length, 3);
  for (const row of group.paywalls) {
    assert.equal(row.users, 60);
    assert.equal(row.conversions, 10);
    assert.equal(row.proceeds, 85);
    assert.equal(row.estimates[7].reason, null);
    assert.notEqual(row.estimates[7].chanceBest, null);
  }
  assert.equal(group.placements[0].proceeds, 255);
  assert.equal(result.groups.find((g) => g.language === "all" && g.experiment === "price_v1")!.paywalls.length, 1);
});

test("invalid product lists cannot bypass fallback checks", () => {
  const result = report([attribute("bad", "gp1_a_price_v1", record({ allowedProducts: [] }))], []);
  assert.equal(result.groups.length, 0);
  assert.match(result.warnings[0], /1 malformed/);
});
