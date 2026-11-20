import { campaignDays, VERSY_META_MARKETS, type AcquisitionChart, type RoasDay } from "./versy-meta-roas";

const TRANSACTION_LIMIT = 50_000;
export type CampaignTransaction = {
  id: string; name: string; originalTransactionId: string; transactionId: string | null;
  campaignId: string; installDay: string; periodType: string | null; isRefund: number;
  proceeds: number | string | null; eventTs: number | string;
  attributionTs: number | string; insertedAt: number | string;
};

/** A charge and its refund are separate money movements; repeated notifications are not. */
export function campaignTransactionProceeds(rows: CampaignTransaction[], days: RoasDay[], asOf: number): AcquisitionChart {
  const selectedDays = new Set(days.map((day) => day.date));
  const selectedCampaigns = new Set<string>(VERSY_META_MARKETS.flatMap((market) => market.campaigns.map((campaign) => campaign.id)));
  const latest = new Map<string, CampaignTransaction>();
  for (const row of rows) {
    if (!row.id || !Number.isFinite(Number(row.eventTs)) || !Number.isFinite(Number(row.attributionTs))
      || !Number.isFinite(Number(row.insertedAt))) throw new Error("Incomplete acquisition transaction identity or timestamps");
    if (Number(row.eventTs) >= asOf) continue;
    if (!["initial_purchase", "renewal", "non_renewing_purchase"].includes(row.name) && !Number(row.isRefund)) continue;
    const key = JSON.stringify([row.originalTransactionId, row.transactionId || row.id, Boolean(Number(row.isRefund))]);
    const previous = latest.get(key);
    if (!previous || Number(row.attributionTs) > Number(previous.attributionTs)
      || (Number(row.attributionTs) === Number(previous.attributionTs) && Number(row.insertedAt) > Number(previous.insertedAt))) latest.set(key, row);
  }
  const data = new Map<string, Record<string, { y: number }>>();
  for (const row of latest.values()) {
    if (!selectedDays.has(row.installDay) || !selectedCampaigns.has(row.campaignId)) continue;
    const refund = Boolean(Number(row.isRefund));
    const missingMoney = row.proceeds == null || row.proceeds === "";
    if (missingMoney && row.name === "initial_purchase" && row.periodType?.toLowerCase() === "trial" && !refund) continue;
    if (missingMoney || !Number.isFinite(Number(row.proceeds))) throw new Error("Acquisition transaction is missing proceeds");
    // Money is reported in USD; integer cents avoid floating-point accumulation drift.
    const cents = Math.round(Number(row.proceeds) * 100);
    const values = data.get(row.installDay) ?? {};
    values[row.campaignId] = { y: (values[row.campaignId]?.y ?? 0) + (refund ? -Math.abs(cents) : cents) };
    data.set(row.installDay, values);
  }
  return { data: [...data].map(([x, values]) => ({ x, values: Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { y: value.y / 100 }])) })) };
}

/** Revenue is calculated from the ledger. Only spend uses Superwall's chart endpoint. */
export async function fetchVersyCampaignDays(apiKey: string, days: RoasDay[], to: string, request: typeof fetch = fetch) {
  const from = `${days[0].date}T00:00:00Z`, startMs = Date.parse(from), asOf = Date.parse(to);
  if (!Number.isFinite(startMs) || !Number.isFinite(asOf) || asOf <= startMs) throw new Error("Invalid acquisition reporting window");
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const transactions = async () => {
    const response = await request("https://api.superwall.com/v2/organizations/25476/query", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(60_000), headers,
      body: `SELECT id, name, originalTransactionId, transactionId,
        JSONExtractString(ifNull(userAttributes, ''), 'acquisition_campaign_id') AS campaignId,
        toString(toDate(installDate, 'UTC')) AS installDay, periodType, isRefund, proceeds,
        toUnixTimestamp64Milli(ts) AS eventTs, toUnixTimestamp64Milli(attributionTs) AS attributionTs,
        toUnixTimestamp64Milli(insertedAt) AS insertedAt
        FROM open_revenue.attributed_events_by_ts_rep FINAL
        WHERE applicationId = 51393 AND isSandbox = 0 AND source = 'integration' AND isFamilyShare = 0
          AND (name IN ('initial_purchase', 'renewal', 'non_renewing_purchase') OR isRefund = 1)
          AND ts >= fromUnixTimestamp64Milli(${startMs}) AND ts < fromUnixTimestamp64Milli(${asOf}) AND ts < now()
          AND installDate >= fromUnixTimestamp64Milli(${startMs}) AND installDate < fromUnixTimestamp64Milli(${asOf})
        LIMIT ${TRANSACTION_LIMIT} FORMAT JSON`,
    });
    if (!response.ok) throw new Error(`Superwall acquisition ledger returned ${response.status}`);
    const result = await response.json() as { data?: CampaignTransaction[]; rows?: number; exception?: string };
    if (result.exception || !Array.isArray(result.data) || result.rows !== result.data.length
      || result.data.length >= TRANSACTION_LIMIT) throw new Error("Incomplete acquisition transaction query");
    return campaignTransactionProceeds(result.data, days, asOf);
  };
  const spend = async () => {
    const response = await request("https://api.superwall.com/v2/charts/data", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(60_000), headers,
      body: JSON.stringify({ application_id: "51393", y_axis: "adSpend", x_axis: "tsDate",
        breakdown: "acquisitionCampaignId", date_interval: "day", environment: ["PRODUCTION"],
        date_filter: { dimension: "tsDate", preset: "custom", range: { from, to } } }),
    });
    if (!response.ok) throw new Error(`Superwall adSpend returned ${response.status}`);
    const chart = await response.json() as AcquisitionChart & { y_axis?: { key: string }; x_axis?: { key: string } };
    if (chart.y_axis?.key !== "adSpend" || chart.x_axis?.key !== "tsDate"
      || !Array.isArray(chart.series) || !chart.series.every((s) => s.breakdown === "acquisitionCampaignId")
      || !Array.isArray(chart.data) || !chart.data.every((point) => typeof point.x === "string"
        && Number.isFinite(Date.parse(point.x)) && point.values && typeof point.values === "object"
        && Object.values(point.values).every((value) => value && (value.y === null || Number.isFinite(value.y))))) {
      throw new Error("Unexpected Superwall adSpend chart response");
    }
    return chart;
  };
  const [proceedsChart, spendChart] = await Promise.all([transactions(), spend()]);
  return campaignDays(proceedsChart, spendChart, days);
}
