import { BetaAnalyticsDataClient } from "@google-analytics/data";

function getCredentials() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json);
}

const GA4_PROPERTIES: Record<string, string> = {
  Glow: process.env.GA4_PROPERTY_ID_GLOW!,
  Bible: process.env.GA4_PROPERTY_ID_BIBLE!,
};

export type AppName = "Glow" | "Bible";

export async function getFirstOpenCount(
  appName: AppName,
  startDate: string,
  endDate: string
): Promise<number> {
  const credentials = getCredentials();
  const client = new BetaAnalyticsDataClient({ credentials });

  const [response] = await client.runReport({
    property: `properties/${GA4_PROPERTIES[appName]}`,
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: "first_open" },
      },
    },
  });

  const count = response.rows?.[0]?.metricValues?.[0]?.value;
  return count ? parseInt(count, 10) : 0;
}
