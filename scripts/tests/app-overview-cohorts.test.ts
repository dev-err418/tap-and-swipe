import assert from "node:assert/strict";
import test from "node:test";
import { buildAppOverviewCohorts, cohortAppu, cohortSubscriptionRetention, totalCohortAppu, overviewForLanguage, overviewDailyPoints } from "../../lib/app-overview-cohorts";

const DAY = 86_400_000;
const start = Date.parse("2026-09-01T10:00:00Z");
const install = (appUserId: string, day = 0) => ({ appUserId, installedAt: start + day * DAY });
const event = (appUserId: string, day = 0, overrides: Partial<Parameters<typeof buildAppOverviewCohorts>[0]["events"][number]> = {}) => ({
  appUserId, name: "initial_purchase", originalTransactionId: appUserId, transactionId: `${appUserId}-${day}`,
  isRefund: false, netProceeds: 10, eventTs: start + day * DAY, attributionTs: start + day * DAY,
  expiresAt: start + 365 * DAY, ...overrides,
});
const report = (installs: Parameters<typeof buildAppOverviewCohorts>[0]["installs"], events: ReturnType<typeof event>[], overrides: Partial<Parameters<typeof buildAppOverviewCohorts>[0]> = {}) => buildAppOverviewCohorts({
  period: "month", startMs: start, endMs: start + 29 * DAY, asOf: start + 31 * DAY,
  installs, events, downloads: [], ...overrides,
});

test("fixed-age APPU includes non-payers, linked renewals and refunds, and excludes later or unrelated money", () => {
  const data = report([install("buyer"), install("free"), install("recent", 28), install("older", -1), install("outside", 29)], [
    event("buyer"), event("buyer", 6, { name: "renewal" }),
    event("buyer", 6.5, { name: "cancellation", isRefund: true, netProceeds: 5 }),
    event("buyer", 8, { name: "renewal", netProceeds: 100 }),
    event("recent", 28, { netProceeds: 200 }),
    event("older", 2, { name: "renewal", netProceeds: 1000 }),
    event("outside", 29, { netProceeds: 1000 }),
    event("buyer", 32, { name: "renewal", netProceeds: 1000 }),
  ]);
  assert.equal(data.summary[7].eligibleInstalls, 2);
  assert.equal(data.summary[7].pendingInstalls, 1);
  assert.equal(data.summary[7].proceeds, 15);
  assert.equal(cohortAppu(data.summary[7]), 7.5);
  assert.equal(data.summary[14].proceeds, 115);
  assert.equal(data.summary[30].eligibleInstalls, 2);
  assert.equal(data.points.reduce((sum, point) => sum + point.trackedInstalls, 0), 3);
  assert.deepEqual(data.total, { installs: 3, paid: 2, trials: 0, proceeds: 315, missingMoney: 0 });
  assert.equal(totalCohortAppu(data.total), 105);
});

test("maturity uses full elapsed days, with exact boundaries and no borrowed older cohorts", () => {
  const data = report([install("boundary"), { ...install("young"), installedAt: start + 1 }], [], { asOf: start + 7 * DAY });
  assert.equal(data.summary[7].eligibleInstalls, 1);
  assert.equal(data.summary[7].pendingInstalls, 1);
  assert.equal(cohortAppu(data.summary[7]), 0);
  assert.equal(cohortAppu(data.summary[14]), null);
  const recent = report([install("old"), install("recent", 28)], [], { startMs: start + 28 * DAY });
  assert.equal(recent.summary[7].eligibleInstalls, 0);
  assert.equal(recent.summary[7].pendingInstalls, 1);
  assert.equal(cohortAppu(recent.summary[7]), null);
  assert.equal(totalCohortAppu(recent.total), 0); // observed non-payers, regardless of cohort age
});

test("through-today APPU follows recent installs and late renewals past the selected period", () => {
  const data = report([install("buyer", 28), install("free", 28), install("old", 0)], [
    event("buyer", 28), event("buyer", 30, { name: "renewal", netProceeds: 20 }),
    event("old", 29, { name: "renewal", netProceeds: 1000 }),
  ], { startMs: start + 28 * DAY });
  assert.equal(data.summary[7].eligibleInstalls, 0);
  assert.equal(totalCohortAppu(data.total), 15);
  const populated = data.points.find((point) => point.total.installs > 0)!;
  assert.equal(totalCohortAppu(populated.total), 15);
  assert.equal(totalCohortAppu(data.points.find((point) => point.total.installs === 0)!.total), null);
});

test("transaction revisions count once and missing money stays unavailable rather than zero", () => {
  const charge = event("buyer");
  const data = report([install("buyer")], [charge, { ...charge, name: "non_renewing_purchase", netProceeds: 12, attributionTs: charge.attributionTs + 1 },
    event("buyer", 1, { name: "cancellation", netProceeds: 0 }),
  ]);
  assert.equal(data.summary[7].proceeds, 12);
  const missing = report([install("buyer")], [event("buyer", 0, { netProceeds: null })]);
  assert.equal(missing.summary[7].missingMoney, 1);
  assert.equal(cohortAppu(missing.summary[7]), null);
  assert.equal(totalCohortAppu(missing.total), null);
  const missingRefund = report([install("buyer")], [charge, event("buyer", 1, { name: "cancellation", isRefund: true, netProceeds: null })]);
  assert.equal(cohortAppu(missingRefund.summary[7]), null);
  assert.equal(totalCohortAppu(missingRefund.total), null);
});

test("subscription retention measures subscription age, keeps cancellations and refunds, and excludes immature subscriptions", () => {
  const data = report([install("active"), install("cancelled"), install("refunded"), install("later"), install("free")], [
    event("active", 2), event("cancelled", 2), event("refunded", 2), event("later", 8),
    event("cancelled", 8, { name: "cancellation", netProceeds: 0 }),
    event("cancelled", 10, { name: "renewal" }), // after the D7 checkpoint
    event("refunded", 8, { name: "cancellation", isRefund: true, netProceeds: -10 }),
  ], { asOf: start + 10 * DAY });
  assert.equal(data.summary[7].eligibleSubscriptions, 3);
  assert.equal(data.summary[7].retainedSubscriptions, 1);
  assert.equal(data.summary[7].pendingSubscriptions, 1);
  assert.equal(cohortSubscriptionRetention(data.summary[7]), 1 / 3);
  assert.equal(data.summary[14].eligibleSubscriptions, 0);
  assert.equal(cohortSubscriptionRetention(data.summary[14]), null);
});

test("known subscription chains resolve identity-free renewals without importing pre-install subscriptions", () => {
  const data = report([install("buyer"), install("old-chain", 3)], [
    event("buyer"), event("", 3, { name: "renewal", originalTransactionId: "buyer", transactionId: "renewal", netProceeds: 20 }),
    event("old-chain", 0), event("old-chain", 4, { name: "renewal", netProceeds: 1000 }),
  ]);
  assert.equal(data.summary[7].proceeds, 30);
  assert.equal(data.summary[7].eligibleSubscriptions, 1);
});

test("summary APPU and retention use weighted totals instead of averaging daily rates", () => {
  const data = report([install("a"), install("b"), install("c", 1)], [
    event("a", 0, { netProceeds: 10 }), event("b", 0, { netProceeds: 0 }), event("c", 1, { netProceeds: 20 }),
    event("b", 2, { name: "cancellation", netProceeds: 0 }), event("c", 3, { name: "cancellation", netProceeds: 0 }),
  ]);
  assert.equal(cohortAppu(data.summary[7]), 10);
  assert.equal(cohortSubscriptionRetention(data.summary[7]), 1 / 3);
});

test("daily acquisition buckets include empty days and retain authoritative install totals", () => {
  const data = report([install("tracked")], [], { endMs: start + 2 * DAY, downloads: [
    { bucket: new Date(start), downloads: 4 }, { bucket: new Date(start + 4 * 3_600_000), downloads: 3 },
  ] });
  assert.equal(data.points.length, 3); // selected partial first and last Paris days
  assert.deepEqual(data.points.map((point) => point.installs), [7, 0, 0]);
  assert.equal(data.summary[7].eligibleInstalls, 1); // aggregate installs are not the cohort denominator
});

test("four-hour Paris buckets survive 23/25-hour DST days without repeats or gaps", () => {
  for (const [startMs, endMs, hours] of [
    [Date.parse("2026-03-28T23:00:00Z"), Date.parse("2026-03-29T22:00:00Z"), 23],
    [Date.parse("2026-10-24T22:00:00Z"), Date.parse("2026-10-25T23:00:00Z"), 25],
  ]) {
    const data = report([], [], { period: "week", startMs, endMs });
    assert.equal((endMs - startMs) / 3_600_000, hours);
    assert.equal(data.points.length, 6);
    assert.equal(new Set(data.points.map((point) => point.date)).size, 6);
    assert.equal(data.points[0].date, new Date(startMs).toISOString());
  }
});

test("short ranges preserve hourly installs and APPU; weeks combine them into four-hour cohorts", () => {
  const startMs = Date.parse("2026-09-01T22:00:00Z"); // Paris midnight
  const hour = 3_600_000;
  const installedAt = startMs + 30 * 60_000;
  const installs = [{ appUserId: "buyer", installedAt }, { appUserId: "free", installedAt: installedAt + hour }];
  const events = [event("buyer", 0, { eventTs: installedAt, attributionTs: installedAt })];
  const downloads = [{ bucket: new Date(startMs), downloads: 2 }, { bucket: new Date(startMs + hour), downloads: 3 }];
  for (const [period, days, expectedPoints] of [
    ["day", 1, 24], ["yesterday", 1, 24], ["3days", 3, 72], ["week", 7, 42],
  ] as const) {
    const data = report(installs, events, { period, startMs, endMs: startMs + days * DAY, downloads });
    assert.equal(data.points.length, expectedPoints, period);
    assert.equal(data.points.reduce((sum, point) => sum + point.installs, 0), 5);
    assert.equal(totalCohortAppu(data.total), 5); // grouping never changes the weighted summary
    if (period === "week") {
      assert.equal(data.points[0].installs, 5);
      assert.equal(totalCohortAppu(data.points[0].total), 5);
      assert.equal(Date.parse(data.points[1].date) - startMs, 4 * hour);
    } else {
      assert.deepEqual(data.points.slice(0, 2).map((point) => point.installs), [2, 3]);
      assert.deepEqual(data.points.slice(0, 2).map((point) => totalCohortAppu(point.total)), [10, 0]);
      assert.equal(Date.parse(data.points[1].date) - startMs, hour);
    }
  }
});

test("hourly short-range cohorts include every elapsed hour on 23/25-hour DST days", () => {
  for (const [startMs, endMs, hours] of [
    [Date.parse("2026-03-28T23:00:00Z"), Date.parse("2026-03-29T22:00:00Z"), 23],
    [Date.parse("2026-10-24T22:00:00Z"), Date.parse("2026-10-25T23:00:00Z"), 25],
  ]) {
    for (const period of ["day", "yesterday", "3days"] as const) {
      const data = report([], [], { period, startMs, endMs });
      assert.deepEqual(data.points.map((point) => point.date), Array.from({ length: hours }, (_, index) =>
        new Date(startMs + index * 3_600_000).toISOString()));
    }
  }
});

test("language APPU keeps non-payers, uses the first install's language and follows deduplicated renewals/refunds", () => {
  const renewal = event("", 8, { name: "renewal", originalTransactionId: "spanish-buyer", transactionId: "renewal", netProceeds: 20 });
  const data = report([
    { ...install("spanish-buyer"), language: " es-MX " },
    { ...install("spanish-buyer", 1), language: "en" }, // later language changes do not move the cohort
    { ...install("spanish-free"), language: "es_ES" },
    { ...install("english", 1), language: "en-US" },
    { ...install("older", -1), language: "es" },
    install("unknown", 2),
  ], [
    event("spanish-buyer"), renewal, { ...renewal, attributionTs: renewal.attributionTs + 1, netProceeds: 22 },
    event("", 9, { name: "cancellation", isRefund: true, originalTransactionId: "spanish-buyer", netProceeds: 2 }),
    event("english", 1, { netProceeds: 8 }), event("older", 2, { netProceeds: 1000 }),
  ], { downloads: [{ bucket: new Date(start), downloads: 10 }] });
  assert.equal(overviewForLanguage(data, "all"), data);
  assert.deepEqual(data.languages, {
    es: { installs: 2, paid: 1, trials: 0, proceeds: 30, missingMoney: 0 },
    en: { installs: 1, paid: 1, trials: 0, proceeds: 8, missingMoney: 0 },
    unknown: { installs: 1, paid: 0, trials: 0, proceeds: 0, missingMoney: 0 },
  });
  const spanish = overviewForLanguage(data, "es");
  assert.equal(totalCohortAppu(spanish.total), 15);
  assert.equal(spanish.points.reduce((sum, point) => sum + point.installs, 0), 2);
  assert.deepEqual(spanish.points.map((point) => point.date), data.points.map((point) => point.date));
  assert.equal(data.points.reduce((sum, point) => sum + point.installs, 0), 10); // All preserves authoritative installs
  assert.equal(Object.values(data.languages).reduce((sum, metric) => sum + metric.proceeds, 0), data.total.proceeds);
  assert.equal(Object.values(data.languages).reduce((sum, metric) => sum + metric.installs, 0), data.total.installs);
  assert.equal(totalCohortAppu(overviewForLanguage(data, "fr").total), null);
});

test("missing language and missing proceeds stay explicit and affect only their language's APPU", () => {
  const data = report([
    { ...install("english"), language: "en" },
    { ...install("missing"), language: "" },
    { ...install("malformed"), language: "not a language" },
  ], [event("english"), event("missing", 0, { netProceeds: null })]);
  assert.equal(totalCohortAppu(overviewForLanguage(data, "en").total), 10);
  assert.deepEqual(data.languages.unknown, { installs: 2, paid: 0, trials: 0, proceeds: 0, missingMoney: 1 });
  assert.equal(totalCohortAppu(overviewForLanguage(data, "unknown").total), null);
  assert.equal(totalCohortAppu(data.total), null);
  assert.equal(overviewForLanguage(report([], [], { available: false }), "en").available, false);
});

test("daily APPU stays constant across hourly buckets and is weighted by installs in the selected language", () => {
  const data = report([
    { ...install("buyer"), language: "es" },
    ...Array.from({ length: 9 }, (_, index) => ({ ...install(`free-${index}`), installedAt: start + 3_600_000, language: "es" })),
    { ...install("english"), language: "en" },
    { ...install("tomorrow", 1), language: "es" },
  ], [event("buyer"), event("english", 0, { netProceeds: 100 }), event("tomorrow", 1, { netProceeds: 20 })],
  { period: "3days", endMs: start + 3 * DAY });
  const points = overviewDailyPoints(overviewForLanguage(data, "es"));
  const firstDay = points.filter((point) => point.dayStartMs === points[0].dayStartMs);
  assert.ok(firstDay.length > 1);
  assert.ok(firstDay.every((point) => point.appu === 1)); // $10 / 10 users, not mean($10, $0)
  assert.ok(firstDay.every((point) => point.dailyTotal.installs === 10));
  assert.ok(points.filter((point) => point.dayStartMs === firstDay[0].dayEndMs).every((point) => point.appu === 20));
  assert.equal(points.at(-1)!.appu, null); // do not carry the prior day's average over an empty day
  assert.equal(overviewDailyPoints(data)[0].appu, 10); // $110 / 11 users across all languages
});

test("daily averages follow Paris DST boundaries and hide the whole day if proceeds are missing", () => {
  const startMs = Date.parse("2026-10-24T22:00:00Z");
  const endMs = Date.parse("2026-10-25T23:00:00Z");
  const data = report([
    { appUserId: "first-hour", installedAt: Date.parse("2026-10-25T00:30:00Z") },
    { appUserId: "repeated-hour", installedAt: Date.parse("2026-10-25T01:30:00Z") },
  ], [event("first-hour", 0, { eventTs: startMs + 3 * 3_600_000 }),
    event("repeated-hour", 0, { eventTs: startMs + 4 * 3_600_000, netProceeds: null })],
  { period: "yesterday", startMs, endMs, asOf: endMs });
  const points = overviewDailyPoints(data);
  assert.equal(points.length, 25);
  assert.ok(points.every((point) => point.dayStartMs === startMs && point.dayEndMs === endMs));
  assert.ok(points.every((point) => point.dailyTotal.installs === 2 && point.appu === null));
  assert.ok(overviewDailyPoints(report([install("buyer")], [event("buyer")], { available: false })).every((point) => point.appu === null));
});

test("conversion counts unique ever-paid installers through today and follows the selected language", () => {
  const data = report([
    { ...install("paid"), language: "es" }, { ...install("trial"), language: "es" },
    { ...install("converted"), language: "en" }, { ...install("free"), language: "en" },
    { ...install("older", -1), language: "en" },
  ], [
    event("paid"), event("paid", 1, { name: "renewal" }),
    event("paid", 2, { name: "cancellation", isRefund: true, netProceeds: 20 }),
    event("trial", 0, { netProceeds: 0 }),
    event("converted", 0, { netProceeds: 0 }),
    event("", 30, { name: "renewal", originalTransactionId: "converted", transactionId: "conversion", netProceeds: 5 }),
    event("older", 2, { name: "renewal" }),
    event("free", 32), // beyond report time
  ]);
  assert.equal(data.total.paid, 2);
  assert.equal(data.total.paid / data.total.installs, 0.5);
  assert.equal(overviewForLanguage(data, "es").total.paid, 1);
  assert.equal(overviewForLanguage(data, "en").total.paid, 1);
  assert.equal(data.points.reduce((sum, point) => sum + point.total.paid, 0), 2);
  assert.equal(Object.values(data.languages).reduce((sum, metric) => sum + metric.paid, 0), data.total.paid);
});


test("daily trial rates count unique installers, follow language and retain later trial starts", () => {
  const trial = (user: string, day = 0, overrides = {}) => event(user, day, { periodType: "trial", netProceeds: 0, ...overrides });
  const data = report([
    { ...install("trial"), language: "es" },
    ...Array.from({ length: 9 }, (_, index) => ({ ...install(`free-${index}`), installedAt: start + 3_600_000, language: "es" })),
    { ...install("english"), language: "en" },
    { ...install("tomorrow", 1), language: "es" },
    install("older", -1),
  ], [
    trial("trial"), trial("trial"),
    trial("trial", 1, { originalTransactionId: "second-trial" }),
    trial("trial", 2, { name: "cancellation" }),
    trial("english"), trial("tomorrow", 5, { netProceeds: null }),
    trial("older"), trial("free-0", -1), trial("free-1", 32),
    trial("free-2", 0, { isRefund: true }),
    event("free-3"), // a paid purchase is not a trial
    trial("free-4", 0, { name: "renewal" }),
  ], { period: "3days", endMs: start + 3 * DAY });
  const points = overviewDailyPoints(overviewForLanguage(data, "es"));
  const firstDay = points.filter((point) => point.dayStartMs === points[0].dayStartMs);
  assert.ok(firstDay.length > 1);
  assert.ok(firstDay.every((point) => point.trialRate === 0.1));
  const nextDay = points.filter((point) => point.dayStartMs === firstDay[0].dayEndMs);
  assert.ok(nextDay.every((point) => point.trialRate === 1 && point.appu === null));
  assert.equal(points.at(-1)!.trialRate, null);
  assert.equal(data.total.trials, 3);
  assert.equal(overviewForLanguage(data, "es").total.trials, 2);
  assert.equal(overviewDailyPoints(data)[0].trialRate, 2 / 11);
  assert.ok(overviewDailyPoints({ ...data, available: false }).every((point) => point.trialRate === null));
  const zero = overviewDailyPoints(report([install("free")], []));
  assert.equal(zero.find((point) => point.dailyTotal.installs > 0)!.trialRate, 0);
});
