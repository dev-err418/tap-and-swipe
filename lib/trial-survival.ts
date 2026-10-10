type TrialEvent = {
  originalTransactionId: string;
  name: string;
  periodType: string;
  eventTs: number;
  expiresAt: number;
  isRefund: boolean;
};

const SEVEN_DAYS_MS = 7 * 86_400_000;

/** Only the original trial purchase determines duration, never a renewal or cancellation. */
export function sevenDayTrialSurvival(events: TrialEvent[], startMs: number, endMs: number, asOf: number) {
  const buckets = TRIAL_CANCEL_BUCKETS.map((bucket) => ({
    key: bucket.key, label: bucket.label, cancels: 0, highlight: bucket.highlight,
  }));
  const chains = new Map<string, TrialEvent[]>();
  for (const event of events) {
    if (!event.originalTransactionId || !Number.isFinite(event.eventTs) || event.eventTs > asOf) continue;
    const chain = chains.get(event.originalTransactionId) ?? [];
    chain.push(event);
    chains.set(event.originalTransactionId, chain);
  }
  let trials = 0;
  let cancelled = 0;
  let cancelledBeforeQualified = 0;
  for (const chain of chains.values()) {
    const start = chain.filter((event) => event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund)
      .sort((a, b) => a.eventTs - b.eventTs)[0];
    if (!start || start.eventTs < startMs || start.eventTs >= endMs) continue;
    // Allow one minute of timestamp rounding; missing expiry and 3-day offers are excluded.
    if (!Number.isFinite(start.expiresAt) || Math.abs(start.expiresAt - start.eventTs - SEVEN_DAYS_MS) > 60_000) continue;
    trials += 1;
    const cancel = chain.filter((event) => (event.name === "cancellation" || event.isRefund)
      && event.eventTs >= start.eventTs && event.eventTs < start.eventTs + SEVEN_DAYS_MS)
      .sort((a, b) => a.eventTs - b.eventTs)[0];
    if (!cancel) continue;
    const minutes = (cancel.eventTs - start.eventTs) / 60_000;
    cancelled += 1;
    if (minutes <= 15) cancelledBeforeQualified += 1;
    const index = TRIAL_CANCEL_BUCKETS.findIndex((bucket) => minutes <= bucket.maxMinutes);
    if (index >= 0) buckets[index].cancels += 1;
  }
  return { trials, cancelled, cancelledBeforeQualified, buckets };
}

const TRIAL_CANCEL_BUCKETS: { key: string; label: string; maxMinutes: number; highlight?: boolean }[] = [
  { key: "0-5m", label: "0–5m", maxMinutes: 5 },
  { key: "5-10m", label: "5–10m", maxMinutes: 10 },
  { key: "10-15m", label: "10–15m", maxMinutes: 15, highlight: true },
  { key: "15-30m", label: "15–30m", maxMinutes: 30 },
  { key: "30-60m", label: "30–60m", maxMinutes: 60 },
  { key: "60-120m", label: "60–120m", maxMinutes: 120 },
  { key: "2-6h", label: "2–6h", maxMinutes: 6 * 60 },
  { key: "6-12h", label: "6–12h", maxMinutes: 12 * 60 },
  { key: "12-24h", label: "12–24h", maxMinutes: 24 * 60 },
  { key: "1-2d", label: "1–2d", maxMinutes: 48 * 60 },
  { key: "2-3d", label: "2–3d", maxMinutes: 72 * 60 },
  { key: "3-4d", label: "3–4d", maxMinutes: 4 * 24 * 60 },
  { key: "4-5d", label: "4–5d", maxMinutes: 5 * 24 * 60 },
  { key: "5-6d", label: "5–6d", maxMinutes: 6 * 24 * 60 },
  { key: "6-7d", label: "6–7d", maxMinutes: 7 * 24 * 60 },
];
