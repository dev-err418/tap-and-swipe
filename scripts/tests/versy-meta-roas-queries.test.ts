import assert from "node:assert/strict";
import test from "node:test";
import { fetchVersyCampaignDays, campaignTransactionProceeds, type CampaignTransaction } from "../../lib/versy-meta-roas-queries";
import { campaignDays, roasDays } from "../../lib/versy-meta-roas";

const fr = "120255328753620450", qualified = "120255385345590450", de = "120255328782510450";
const point = (date: string, values: Record<string, number | null>) => ({ x: `${date}T00:00:00`, values: Object.fromEntries(Object.entries(values).map(([id, y]) => [id, { y }])) });
const charge = (extra: Partial<CampaignTransaction> = {}): CampaignTransaction => ({
  id: "notification-1", name: "initial_purchase", originalTransactionId: "chain", transactionId: "purchase",
  campaignId: fr, installDay: "2026-11-13", periodType: "normal", isRefund: 0, proceeds: "15.51",
  eventTs: Date.parse("2026-11-13T10:00:00Z"), attributionTs: 1, insertedAt: 1, ...extra,
});
const days = roasDays(new Date("2026-11-20T20:00:00Z"));

test("new conversions and refunds update the original cohort through consecutive UTC day rollovers without chart revenue", async () => {
  const rows: CampaignTransaction[] = [charge(),
    charge({ id: "trial", transactionId: "trial", periodType: "trial", proceeds: null }),
    charge({ id: "conversion", transactionId: "paid", name: "renewal", proceeds: "157.69", eventTs: Date.parse("2026-11-20T08:00:00Z") }),
    charge({ id: "refund", transactionId: "paid", name: "cancellation", isRefund: 1, proceeds: "31.61", eventTs: Date.parse("2026-11-21T08:00:00Z") }),
  ];
  const metrics: string[] = [], queries: string[] = [];
  const request: typeof fetch = async (url, init) => {
    assert.equal(init?.cache, "no-store");
    if (String(url).endsWith("/query")) {
      const sql = String(init?.body); queries.push(sql);
      for (const filter of ["applicationId = 51393", "isSandbox = 0", "source = 'integration'", "isFamilyShare = 0", "ts < now()", "installDate >=", "LIMIT 50000"]) assert.ok(sql.includes(filter));
      return Response.json({ data: rows, rows: rows.length });
    }
    const body = JSON.parse(String(init?.body)); metrics.push(body.y_axis);
    assert.equal(body.y_axis, "adSpend", "No revenue/ROAS chart request may influence the report");
    assert.equal(body.x_axis, "tsDate");
    assert.equal(body.date_filter.dimension, "tsDate");
    assert.deepEqual(body.environment, ["PRODUCTION"]);
    return Response.json({ y_axis: { key: "adSpend" }, x_axis: { key: "tsDate" },
      series: [fr, qualified, de].map((key) => ({ key, breakdown: "acquisitionCampaignId" })),
      data: [point("2026-11-13", { [fr]: 66.3377, [qualified]: 10, [de]: 20 })] });
  };
  const expected = [15.51, 173.20, 141.59];
  for (const [index, to] of ["2026-11-19T20:00:00Z", "2026-11-20T20:00:00Z", "2026-11-21T20:00:00Z"].entries()) {
    const report = await fetchVersyCampaignDays("test-key", roasDays(new Date(to)), to, request);
    assert.equal(report[fr]["2026-11-13"].proceeds, expected[index]);
    assert.equal(report[fr]["2026-11-13"].roas, expected[index] / 66.3377);
    assert.equal(report[fr][to.slice(0, 10)].proceeds, 0, "A renewal must not move revenue to the conversion day");
    assert.equal(report[qualified]["2026-11-13"].proceeds, 0);
  }
  assert.deepEqual(metrics, ["adSpend", "adSpend", "adSpend"]);
  assert.equal(new Set(queries).size, 3, "SQL must use each refresh's actual observation window");
});

test("duplicate notifications count once, latest corrections win, and refunds remain separate", () => {
  const rows = [charge(), charge({ id: "duplicate", name: "renewal" }),
    charge({ id: "correction", proceeds: "20.00", insertedAt: 2 }),
    charge({ id: "refund", name: "cancellation", isRefund: 1, proceeds: "5.00" }),
    charge({ id: "refund-duplicate", name: "cancellation", isRefund: 1, proceeds: "5.00" }),
    charge({ id: "other", transactionId: "other", campaignId: "not-selected", proceeds: "999" }),
  ];
  const chart = campaignTransactionProceeds(rows, days, Date.parse("2026-11-20T20:00:00Z"));
  assert.equal(chart.data[0].values[fr].y, 15);
  assert.equal(chart.data[0].values["not-selected"], undefined);
  // A later attribution correction moves, rather than duplicates, the charge.
  rows.push(charge({ id: "reattributed", campaignId: de, proceeds: "20.00", attributionTs: 3 }));
  const updated = campaignTransactionProceeds(rows, days, Date.parse("2026-11-20T20:00:00Z"));
  assert.equal(updated.data[0].values[fr].y, -5);
  assert.equal(updated.data[0].values[de].y, 20);
});

test("missing transaction IDs use notification identity rather than collapse unrelated money", () => {
  const rows = [charge({ transactionId: null }), charge({ id: "second", transactionId: null })];
  assert.equal(campaignTransactionProceeds(rows, days, Date.now()).data[0].values[fr].y, 31.02);
});

test("missing paid amounts and explicit unknown spend cannot silently become zero", () => {
  for (const proceeds of [null, "", "bad"]) assert.throws(() => campaignTransactionProceeds([charge({ proceeds })], days, Date.now()), /missing proceeds/);
  assert.throws(() => campaignTransactionProceeds([charge({ eventTs: "bad" })], days, Date.now()), /timestamps/);
  const revenue = { data: [point("2026-11-13", { [fr]: null, [qualified]: -12 })] };
  const result = campaignDays(revenue, { data: [point("2026-11-13", { [fr]: 10, [qualified]: 20 })] }, days);
  assert.equal(result[fr]["2026-11-13"].roas, null);
  assert.equal(result[qualified]["2026-11-13"].roas, -0.6);
  assert.throws(() => campaignDays(revenue, { data: [point("2026-11-13", { [fr]: null })] }, days), /Incomplete/);
});

test("HTTP errors, partial ledger responses and unexpected spend metrics fail closed", async () => {
  for (const failure of ["http", "exception", "partial", "limit", "metric", "dimension", "value"]) {
    const request: typeof fetch = async (url) => {
      if (String(url).endsWith("/query")) {
        if (failure === "http") return new Response("Unavailable", { status: 503 });
        const data = failure === "limit" ? Array(50000).fill(charge()) : [charge()];
        return Response.json({ data, rows: failure === "partial" ? 2 : data.length, exception: failure === "exception" ? "Query failed" : undefined });
      }
      return Response.json({ y_axis: { key: failure === "metric" ? "roas" : "adSpend" },
        x_axis: { key: failure === "dimension" ? "purchaseDate" : "tsDate" },
        series: [{ key: fr, breakdown: "acquisitionCampaignId" }],
        data: [{ x: "2026-11-13", values: { [fr]: { y: failure === "value" ? "bad" : 10 } } }],
      });
    };
    await assert.rejects(fetchVersyCampaignDays("test-key", days, "2026-11-20T20:00:00Z", request));
  }
});
