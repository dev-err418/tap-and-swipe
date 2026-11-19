import assert from "node:assert/strict";
import test from "node:test";
import { fetchVersyCampaignDays } from "../../lib/versy-meta-roas-queries";
import { campaignDays, type AcquisitionChart } from "../../lib/versy-meta-roas";

const fr = "120255328753620450", qualified = "120255385345590450", de = "120255328782510450";
const days = [{ date: "2026-11-12", immature: true }, { date: "2026-11-13", immature: true }];
const to = "2026-11-19T19:00:00.000Z";
const point = (date: string, values: Record<string, number | null>) => ({ x: `${date}T00:00:00`, values: Object.fromEntries(Object.entries(values).map(([id, y]) => [id, { y }])) });

test("recent renewals come from proceeds, never the stale bundled ROAS response, including on subsequent refreshes", async () => {
  let revenue = 192.99;
  const calls: string[] = [];
  const request: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    calls.push(body.y_axis);
    assert.equal(init?.cache, "no-store");
    assert.equal(body.application_id, "51393");
    assert.deepEqual(body.environment, ["PRODUCTION"]);
    assert.deepEqual(body.date_filter.range, { from: "2026-11-12T00:00:00Z", to });
    assert.equal(body.breakdown, "acquisitionCampaignId");
    // The broken upstream response intentionally remains stale across refreshes.
    if (body.y_axis === "roas") return Response.json({ data: [{ x: days[0].date, values: {
      [fr]: { y: 0.6992, extra: { netProceeds: 46.69, adSpend: 66.7763 } },
    } }] });
    const isRevenue = body.y_axis === "netProceeds";
    const dimension = isRevenue ? "installDate" : "tsDate";
    assert.equal(body.x_axis, dimension);
    assert.equal(body.date_filter.dimension, dimension);
    return Response.json({ y_axis: { key: body.y_axis }, x_axis: { key: dimension },
      series: [fr, qualified].map((key) => ({ key, breakdown: "acquisitionCampaignId" })),
      // Deliberately different ordering and a revenue-only campaign/day.
      data: isRevenue ? [point(days[1].date, { [qualified]: 5 }), point(days[0].date, { [fr]: revenue, [qualified]: 62.70 })]
        : [point(days[0].date, { [qualified]: 42.3754, [fr]: 66.7763 }), point(days[1].date, { [fr]: 10 })],
    });
  };
  const first = await fetchVersyCampaignDays("test-key", days, to, request);
  assert.equal(first[fr][days[0].date].proceeds, 192.99);
  assert.equal(first[fr][days[0].date].roas, 192.99 / 66.7763);
  assert.equal(first[qualified][days[0].date].roas, 62.70 / 42.3754);
  assert.deepEqual(first[qualified][days[1].date], { spend: 0, proceeds: 5, roas: null });
  assert.deepEqual(first[fr][days[1].date], { spend: 10, proceeds: 0, roas: 0 });
  assert.deepEqual(first[de][days[0].date], { spend: 0, proceeds: 0, roas: null });
  revenue += 31.62;
  const second = await fetchVersyCampaignDays("test-key", days, to, request);
  assert.equal(second[fr][days[0].date].proceeds, revenue);
  assert.equal(second[fr][days[0].date].roas, revenue / 66.7763);
  assert.deepEqual(calls.sort(), ["adSpend", "adSpend", "netProceeds", "netProceeds"]);
});

test("null proceeds stay unknown, negative proceeds preserve refunds, and missing spend fails", () => {
  const revenue: AcquisitionChart = { data: [point(days[0].date, { [fr]: null, [qualified]: -12 })] };
  const spend: AcquisitionChart = { data: [point(days[0].date, { [fr]: 10, [qualified]: 20 })] };
  const result = campaignDays(revenue, spend, days);
  assert.deepEqual(result[fr][days[0].date], { spend: 10, proceeds: null, roas: null });
  assert.equal(result[qualified][days[0].date].roas, -0.6);
  assert.throws(() => campaignDays(revenue, { data: [point(days[0].date, { [fr]: null })] }, days), /Incomplete/);
});

test("failed or malformed metric queries cannot become a zero-revenue report", async () => {
  for (const failure of ["http", "metric", "dimension", "series", "value"]) {
    const request: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const fail = body.y_axis === "netProceeds";
      if (fail && failure === "http") return new Response("Unavailable", { status: 503 });
      return Response.json({
        y_axis: { key: fail && failure === "metric" ? "roas" : body.y_axis },
        x_axis: { key: fail && failure === "dimension" ? "purchaseDate" : body.x_axis },
        series: fail && failure === "series" ? undefined : [{ key: fr, breakdown: "acquisitionCampaignId" }],
        data: [{ x: days[0].date, values: { [fr]: { y: fail && failure === "value" ? "bad" : 10 } } }],
      });
    };
    await assert.rejects(fetchVersyCampaignDays("test-key", days, to, request), /Superwall/);
  }
});
