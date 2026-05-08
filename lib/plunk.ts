const PLUNK_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Flip contact.data.calBooked = "true" and (optionally) fire
 * PLUNK_CAL_BOOKED_EVENT so the high-ticket Plunk drip's wait-then-condition
 * steps short-circuit before the 1h / 24h reminder emails go out.
 *
 * Safe to call multiple times (idempotent in Plunk). Fired by both the
 * client-side Cal embed callback and the Cal.com server-side webhook so we
 * don't depend on the browser tab still being open when booking succeeds.
 */
export async function markCalBookedInPlunk(email: string, firstName?: string) {
  const plunkUrl = process.env.PLUNK_API_URL;
  const plunkSecretKey = process.env.PLUNK_API_KEY;
  const plunkPublicKey = process.env.PLUNK_PUBLIC_KEY;
  const plunkEvent = process.env.PLUNK_CAL_BOOKED_EVENT;
  if (!plunkUrl || !plunkSecretKey) {
    console.error("[plunk:cal-booked] missing PLUNK_API_URL / PLUNK_API_KEY");
    return;
  }

  const data: Record<string, string> = { calBooked: "true" };
  if (firstName) data.firstName = firstName;

  try {
    const res = await fetchWithTimeout(
      `${plunkUrl}/contacts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${plunkSecretKey}`,
        },
        body: JSON.stringify({ email, data }),
      },
      PLUNK_TIMEOUT_MS,
    );
    if (!res.ok) {
      console.error(
        "[plunk:cal-booked] /contacts error:",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[plunk:cal-booked] /contacts error:", err);
  }

  if (plunkPublicKey && plunkEvent) {
    try {
      const res = await fetchWithTimeout(
        `${plunkUrl}/v1/track`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${plunkPublicKey}`,
          },
          body: JSON.stringify({ email, event: plunkEvent, data }),
        },
        PLUNK_TIMEOUT_MS,
      );
      if (!res.ok) {
        console.error(
          "[plunk:cal-booked] /track error:",
          res.status,
          await res.text().catch(() => ""),
        );
      }
    } catch (err) {
      console.error("[plunk:cal-booked] /track error:", err);
    }
  }
}
