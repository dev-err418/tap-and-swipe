/**
 * GA4 Measurement Protocol — server-side event tracking.
 *
 * Requires two env vars:
 *   NEXT_PUBLIC_GA_ID   — e.g. "G-XXXXXXXXXX"
 *   GA4_API_SECRET      — generated in GA4 Admin › Data Streams › Measurement Protocol API secrets
 */

const ENDPOINT = "https://www.google-analytics.com/mp/collect";

export async function trackGA4Event(
  clientId: string,
  eventName: string,
  params: Record<string, string | number | undefined>,
) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) return;

  // Strip undefined values
  const cleanParams: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) cleanParams[k] = v;
  }

  try {
    await fetch(
      `${ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          events: [{ name: eventName, params: cleanParams }],
        }),
      },
    );
  } catch (err) {
    console.error("[ga4] Failed to send event:", err);
  }
}
