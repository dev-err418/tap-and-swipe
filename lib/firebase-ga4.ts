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

export interface DownloadsByPlatform {
  android: number;
  ios: number;
  total: number;
}

export async function getFirstOpenCount(
  appName: AppName,
  startDate: string,
  endDate: string
): Promise<DownloadsByPlatform> {
  const credentials = getCredentials();
  const client = new BetaAnalyticsDataClient({ credentials });

  const [response] = await client.runReport({
    property: `properties/${GA4_PROPERTIES[appName]}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "platform" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: "first_open" },
      },
    },
  });

  let android = 0;
  let ios = 0;
  for (const row of response.rows || []) {
    const platform = row.dimensionValues?.[0]?.value?.toLowerCase();
    const count = parseInt(row.metricValues?.[0]?.value || "0", 10);
    if (platform === "android") android = count;
    else if (platform === "ios") ios = count;
  }

  return { android, ios, total: android + ios };
}
