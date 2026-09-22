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
  assert.equal(all.estimate.appu, 8.5 / 3);
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
  assert.equal(group.placements[0].estimate.chanceBest, null);
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

test("cohort filter excludes outside users while total APPU includes later renewals", () => {
  const result = report([...fixture("u1"), ...fixture("u2", { assignedAt: start - DAY }, "200")], [money(), money({ id: "later", name: "renewal", transactionId: "101", ts: iso(9), purchasedAt: iso(9) })]);
  const row = result.groups.find((g) => g.language === "all")!.paywalls[0];
  assert.equal(row.users, 1);
  assert.equal(row.proceeds, 17);
  assert.equal(row.estimate.appu, 17);
  assert.equal(row.estimate.users, 1);
});

test("malformed and development attributes never enter production results", () => {
  const result = report([...fixture("dev", { environment: "development" }), attribute("bad", "gp1_a_price_v1", { ...record(), assignedAt: "yesterday" })], []);
  assert.equal(result.groups.length, 0);
  assert.match(result.warnings[0], /1 malformed/);
});

test("probability uses total per-user proceeds and is suppressed for inherited assignments", () => {
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
  assert.ok(rows[1].estimate.chanceBest! > 0.5);
  assert.ok(Math.abs(rows.reduce((sum, r) => sum + r.estimate.chanceBest!, 0) - 1) < 1e-6);
  assert.ok(rows[1].estimate.relativeDelta! > 0);
  assert.ok(rows[1].estimate.credibleInterval![0] < rows[1].estimate.relativeDelta!);
  assert.ok(rows[1].estimate.credibleInterval![1] > rows[1].estimate.relativeDelta!);
  assert.equal(rows[0].estimate.readiness?.status, "collecting");
  assert.ok((rows[0].estimate.readiness?.required ?? 0) > 120);
  const a = JSON.parse(attrs[0].value); a.randomized = false; attrs[0].value = JSON.stringify(a);
  const suppressed = report(attrs, events).groups[0].paywalls[0].estimate;
  assert.equal(suppressed.chanceBest, null);
  assert.equal(suppressed.credibleInterval, null);
  assert.equal(suppressed.readiness, null);
});

test("early paywall estimates stay visible and readiness uses a revenue-producing reference arm", () => {
  const attrs: PaywallAttribute[] = [];
  for (const variant of ["high", "name"]) for (let i = 0; i < 10; i++) {
    const owner = `${variant}_${i}`;
    const tx = String((variant === "high" ? 3000 : 4000) + i);
    const values = fixture(owner, { variant, variantName: variant, paywall: variant }, tx);
    attrs.push(...(variant === "name" && i === 0 ? values : values.slice(0, 2)));
  }
  const result = report(attrs, [money({
    id: "4000",
    originalTransactionId: "4000",
    transactionId: "4000",
  })]);
  const rows = result.groups.find((group) => group.language === "all")!.paywalls;
  const estimate = rows[0].estimate;

  assert.notEqual(estimate.chanceBest, null);
  assert.notEqual(estimate.credibleInterval, null);
  assert.match(estimate.reason ?? "", /20 users and 3 paid users/);
  assert.notEqual(estimate.readiness?.required, null);
  assert.notEqual(estimate.readiness?.status, "unavailable");
  assert.equal(estimate.readiness?.minimumDetectableEffect, 0.5);
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
    assert.equal(row.estimate.reason, null);
    assert.notEqual(row.estimate.chanceBest, null);
  }
  assert.equal(group.placements[0].proceeds, 255);
  assert.equal(result.groups.find((g) => g.language === "all" && g.experiment === "price_v1")!.paywalls.length, 1);
});

test("invalid product lists cannot bypass fallback checks", () => {
  const result = report([attribute("bad", "gp1_a_price_v1", record({ allowedProducts: [] }))], []);
  assert.equal(result.groups.length, 0);
  assert.match(result.warnings[0], /1 malformed/);
});

test("v3 reports five designs separately, including both Weekly packages, without mixing v2", () => {
  const annual = "com.arthurbuildsstuff.glow.Annual";
  const pro = "com.arthurbuildsstuff.glow.pro.yearly";
  const yearly34 = "com.arthurbuildsstuff.glow.yearly.3499";
  const weekly = "com.arthurbuildsstuff.glow.Weekly";
  const variants = [
    ["yr_49", [annual]], ["yr_59", [pro]], ["yr_34", [yearly34]],
    ["yr_wk_59", [pro, weekly]], ["yr_wk_34", [yearly34, weekly]],
  ] as const;
  const attrs: PaywallAttribute[] = [];
  const events: PaywallRevenue[] = [];
  for (const [index, [variant, products]] of variants.entries()) {
    for (let i = 0; i < 60; i++) {
      const owner = `${variant}_${i}`;
      const tx = String(5000 + index * 100 + i);
      const productID = products[i % products.length];
      const assignment = record({ experiment: "native_paywalls_v3", experimentName: "Native paywalls · 5 variants",
        variant, variantName: variant, paywall: variant, variantCount: 5,
        expectedProduct: products[0], allowedProducts: [...products], viewedAt: start + DAY, displayedProduct: productID });
      const placement = { ...assignment, placement: "themes_upgrade", reachedAt: start + DAY };
      attrs.push(attribute(owner, "gp1_a_native_paywalls_v3", assignment),
        attribute(owner, "gp1_p_native_paywalls_v3__themes_upgrade", placement));
      // The same install can retain an old v2 record without joining the new results.
      if (index === 0) attrs.push(attribute(owner, "gp1_a_native_paywalls_v2", record({
        experiment: "native_paywalls_v2", variant: "yr_49", paywall: "yr_49", variantCount: 3,
      })));
      if (i < 10) {
        const purchase: PaywallPurchase = { context: placement, productID, transactionID: tx, originalTransactionID: tx,
          startedAt: start + 2 * DAY, purchasedAt: start + 2 * DAY };
        attrs.push(attribute(owner, `gp1_t_${tx}`, purchase));
        events.push(money({ id: tx, originalTransactionId: tx, transactionId: tx }));
      }
    }
  }
  const result = report(attrs, events);
  const group = result.groups.find((g) => g.language === "all" && g.experiment === "native_paywalls_v3")!;
  assert.equal(group.paywalls.length, 5);
  for (const row of group.paywalls) {
    assert.equal(row.users, 60);
    assert.equal(row.conversions, 10);
    assert.equal(row.proceeds, 85);
    assert.equal(row.estimate.reason, null);
    assert.notEqual(row.estimate.chanceBest, null);
  }
  assert.equal(group.placements[0].proceeds, 425);
  assert.equal(result.groups.find((g) => g.language === "all" && g.experiment === "native_paywalls_v2")!.paywalls[0].proceeds, 0);
  // No winner claim while even one of the five randomized arms is missing.
  const partial = report(attrs.filter((a) => !a.appUserId.startsWith("yr_wk_34_")), events.slice(0, 40));
  const partialGroup = partial.groups.find((g) => g.language === "all" && g.experiment === "native_paywalls_v3")!;
  assert.ok(partialGroup.paywalls.every((row) => row.estimate.chanceBest == null));
});

test("recovery compares complete user outcomes while placements keep direct attribution", () => {
  const attrs: PaywallAttribute[] = [];
  for (const [index, [owner, variant]] of ([["control", "holdout"], ["offer", "recovery"]] as const).entries()) {
    const mainAssignment = record({ experiment: "native_main_v1_en", experimentName: "Main",
      variant: "main", variantName: "Main", paywall: "main", variantCount: 1, viewedAt: start + 0.25 * DAY });
    const mainPlacement = { ...mainAssignment, placement: "onboarding", reachedAt: start + 0.25 * DAY };
    const mainTx = String(201 + index);
    const mainPurchase: PaywallPurchase = { context: mainPlacement, productID: "annual", transactionID: mainTx,
      originalTransactionID: mainTx, startedAt: start + 0.5 * DAY, purchasedAt: start + 0.5 * DAY };
    attrs.push(attribute(owner, "gp1_a_native_main_v1_en", mainAssignment),
      attribute(owner, "gp1_p_native_main_v1_en__onboarding", mainPlacement), attribute(owner, `gp1_t_${mainTx}`, mainPurchase));
    const assignment = record({ experiment: "poky_native_recovery_v1_en", experimentName: "Recovery offer · 50/50",
      variant, variantName: variant === "holdout" ? "No recovery" : "Recovery", paywall: variant,
      expectedProduct: variant, assignedAt: start + 0.3 * DAY, viewedAt: variant === "recovery" ? start + 0.8 * DAY : undefined });
    attrs.push(attribute(owner, "gp1_a_poky_native_recovery_v1_en", assignment));
    if (variant === "recovery") {
      const placement = { ...assignment, placement: "automatic_recovery", reachedAt: start + 0.8 * DAY };
      const purchase: PaywallPurchase = { context: placement, productID: variant, transactionID: "301",
        originalTransactionID: "301", startedAt: start + 2 * DAY, purchasedAt: start + 2 * DAY };
      attrs.push(attribute(owner, "gp1_p_poky_native_recovery_v1_en__automatic_recovery", placement), attribute(owner, "gp1_t_301", purchase));
    }
  }
  const result = report(attrs, [
    money({ id: "main-control", originalTransactionId: "201", transactionId: "201", proceeds: 8, price: 10, ts: iso(0.5) }),
    money({ id: "main-offer", originalTransactionId: "202", transactionId: "202", proceeds: 8, price: 10, ts: iso(0.5) }),
    money({ id: "recovery-offer", originalTransactionId: "301", transactionId: "301", proceeds: 4, price: 5, ts: iso(3) }),
  ]);
  const group = result.groups.find((g) => g.language === "en" && g.experiment === "poky_native_recovery_v1_en")!;
  const holdout = group.paywalls.find((row) => row.id.startsWith("holdout"))!;
  const recovery = group.paywalls.find((row) => row.id.startsWith("recovery"))!;
  assert.equal(holdout.proceeds / holdout.users, 8);
  assert.equal(holdout.views, 0);
  assert.equal(holdout.conversions, 1);
  assert.equal(recovery.proceeds / recovery.users, 12);
  assert.equal(recovery.users, 1);
  assert.equal(recovery.conversions, 1);
  assert.equal(group.outcomeScope, "recovery_eligibility");
  assert.equal(result.groups.find((g) => g.language === "en" && g.experiment === "native_main_v1_en")!.paywalls[0].proceeds, 16);
  assert.equal(group.placements[0].proceeds, 4);
});

const recoveryAssignment = (owner: string, variant = "holdout", language = "en", at = start) =>
  attribute(owner, `gp1_a_poky_native_recovery_v1_${language}`, record({ experiment: `poky_native_recovery_v1_${language}`,
    variant, paywall: variant, language, assignedAt: at }));

test("recovery includes zero payers, identity-linked purchases, renewals and refunds exactly once", () => {
  const attrs = [recoveryAssignment("buyer"), recoveryAssignment("free"), recoveryAssignment("offer", "recovery")];
  const purchase = money({ appUserId: "buyer" });
  const renewal = money({ appUserId: "buyer", name: "renewal", transactionId: "101", ts: iso(4) });
  const refund = money({ appUserId: "buyer", name: "cancellation", transactionId: "101", isRefund: 1, ts: iso(5) });
  const result = report(attrs, [purchase, purchase, renewal, refund,
    money({ appUserId: "buyer", transactionId: "102", ts: iso(-1) }),
    money({ appUserId: "buyer", transactionId: "103", ts: iso(11) }),
    money({ appUserId: "other", transactionId: "104" })]);
  const row = result.groups.find((g) => g.language === "en")!.paywalls.find((r) => r.paywall === "holdout")!;
  assert.equal(row.users, 2);
  assert.equal(row.proceeds, 8.5);
  assert.equal(row.estimate.appu, 4.25);
  assert.equal(row.paid, 1);
  assert.equal(row.conversions, 1);
  assert.equal(row.views, 0);
  assert.equal(row.refunds, 10);
  assert.equal(row.grossRevenue, 20);
});

test("recovery language changes cannot re-enrol users or duplicate their proceeds", () => {
  const result = report([recoveryAssignment("outside", "holdout", "en", start - DAY),
    recoveryAssignment("outside", "recovery", "es"), recoveryAssignment("inside"),
    recoveryAssignment("inside", "recovery", "es", start + 0.5 * DAY)],
  [money({ appUserId: "outside" }), money({ appUserId: "inside", transactionId: "200" })]);
  assert.equal(result.groups.length, 2); // all + English, no second enrollment in Spanish.
  assert.equal(result.groups[0].paywalls[0].users, 1);
  assert.equal(result.groups[0].paywalls[0].proceeds, 8.5);
});

test("recovery loader fetches ordinary purchases by assigned user without purchase attributes", async () => {
  const queries: string[] = [];
  const result = await loadNativePaywalls(async <T>(sql: string) => {
    queries.push(sql);
    if (sql.includes("sw.user_attributes_rep")) return [recoveryAssignment("buyer")] as T[];
    assert.match(sql, /appUserId IN \('buyer'\)/);
    assert.match(sql, /source = 'integration'/);
    assert.match(sql, /isSandbox = 0/);
    assert.match(sql, /isFamilyShare = 0/);
    return [money({ appUserId: "buyer" })] as T[];
  }, 49771, start, start + DAY);
  assert.equal(queries.length, 2);
  assert.equal(result.groups[0].paywalls[0].proceeds, 8.5);
});

test("recovery loader follows transaction anchors even when main assignment predates the cohort", async () => {
  const attrs = [...fixture("buyer", { assignedAt: start - 40 * DAY }), recoveryAssignment("buyer")];
  const result = await loadNativePaywalls(async <T>(sql: string) => {
    if (sql.includes("sw.user_attributes_rep")) return attrs as T[];
    if (sql.includes("AND appUserId IN")) return []; // Apple identity absent, but native context identifies this buyer.
    assert.match(sql, /originalTransactionId IN \('100'\)/);
    return [money()] as T[];
  }, 49771, start, start + DAY);
  assert.equal(result.groups[0].paywalls[0].proceeds, 8.5);
  assert.deepEqual(result.warnings, []);
});

test("unavailable recovery amounts suppress winner estimates", () => {
  const result = report([recoveryAssignment("buyer"), recoveryAssignment("offer", "recovery")],
    [money({ appUserId: "buyer", proceeds: null })]);
  assert.match(result.warnings.join(" "), /amounts are unavailable/);
  assert.equal(result.groups[0].paywalls[0].estimate.chanceBest, null);
});

test("a regular purchase awaiting Apple money also blocks the recovery comparison", () => {
  const result = report([...fixture("buyer"), recoveryAssignment("buyer"), recoveryAssignment("offer", "recovery")], []);
  const group = result.groups.find((g) => g.language === "en" && g.outcomeScope)!;
  assert.equal(group.paywalls.find((row) => row.paywall === "holdout")!.conversions, 1);
  assert.ok(group.paywalls.every((row) => row.estimate.chanceBest == null));
  assert.match(group.paywalls[0].estimate.reason!, /Waiting for Apple server revenue/);
});

test("full-flow v2 and cancellation-only v1 stay separate", () => {
  const v1 = recoveryAssignment("old");
  const v2 = (owner: string, variant: string) => {
    const a = recoveryAssignment(owner, variant);
    return { ...a, key: a.key.replace("_v1_", "_v2_"), value: a.value.replaceAll("_v1_", "_v2_") };
  };
  const result = report([v1, v2("buyer", "holdout"), v2("free", "holdout"), v2("offer", "recovery")],
    [money({ appUserId: "buyer", ts: iso(0.001) }), money({ appUserId: "old", transactionId: "200", proceeds: 100 })]);
  const flow = result.groups.find((g) => g.language === "en" && g.outcomeScope === "recovery_flow")!;
  const control = flow.paywalls.find((row) => row.paywall === "holdout")!;
  assert.equal(control.users, 2);
  assert.equal(control.estimate.appu, 4.25);
  assert.equal(control.views, 0);
  const old = result.groups.find((g) => g.language === "en" && g.outcomeScope === "recovery_eligibility")!;
  assert.equal(old.paywalls[0].proceeds, 100);
});
