import { campaignDays, type AcquisitionChart, type RoasDay } from "./versy-meta-roas";

/** Revenue follows install cohorts; spend follows calendar days over the same UTC window. */
export async function fetchVersyCampaignDays(apiKey: string, days: RoasDay[], to: string, request: typeof fetch = fetch) {
  const from = `${days[0].date}T00:00:00Z`;
  const query = async (metric: "netProceeds" | "adSpend", dimension: "installDate" | "tsDate") => {
    const response = await request("https://api.superwall.com/v2/charts/data", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(60_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: "51393", y_axis: metric, x_axis: dimension,
        breakdown: "acquisitionCampaignId", date_interval: "day", environment: ["PRODUCTION"],
        date_filter: { dimension, preset: "custom", range: { from, to } } }),
    });
    if (!response.ok) throw new Error(`Superwall ${metric} returned ${response.status}`);
    const chart = await response.json() as AcquisitionChart & { y_axis?: { key: string }; x_axis?: { key: string } };
    if (chart.y_axis?.key !== metric || chart.x_axis?.key !== dimension
      || !Array.isArray(chart.series) || !chart.series.every((s) => s.breakdown === "acquisitionCampaignId")
      || !Array.isArray(chart.data) || !chart.data.every((point) => typeof point.x === "string"
        && Number.isFinite(Date.parse(point.x)) && point.values && typeof point.values === "object"
        && Object.values(point.values).every((value) => value && (value.y === null || Number.isFinite(value.y))))) {
      throw new Error(`Unexpected Superwall ${metric} chart response`);
    }
    return chart;
  };
  // Do not use ROAS.extra.netProceeds: that reporting path can omit recent renewals.
  const [proceeds, spend] = await Promise.all([query("netProceeds", "installDate"), query("adSpend", "tsDate")]);
  return campaignDays(proceeds, spend, days);
}
