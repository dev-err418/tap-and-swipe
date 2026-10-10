const DAY_MS = 86_400_000;

type TrialEvent = {
  originalTransactionId: string;
  name: string;
  periodType: string;
  isTrialConversion: boolean;
  isRefund: boolean;
  eventTs: number;
  expiresAt: number;
};

export type ActiveTrials = {
  total: number;
  unknownExpiry: number;
  older: number;
  days: { day: number; label: string; active: number }[];
};

/** Current uncancelled trials whose start falls in the selected reporting window. */
export function activeTrialsByAge(
  events: TrialEvent[], startMs: number, endMs: number, asOf: number,
): ActiveTrials {
  const chains = new Map<string, TrialEvent[]>();
  for (const event of events) {
    if (!event.originalTransactionId || !Number.isFinite(event.eventTs) || event.eventTs > asOf) continue;
    const chain = chains.get(event.originalTransactionId) ?? [];
    chain.push(event);
    chains.set(event.originalTransactionId, chain);
  }
  const report: ActiveTrials = {
    total: 0, unknownExpiry: 0, older: 0,
    days: Array.from({ length: 8 }, (_, day) => ({ day, label: `Day ${day}`, active: 0 })),
  };
  for (const chain of chains.values()) {
    const start = chain.filter((event) => event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund)
      .sort((a, b) => a.eventTs - b.eventTs)[0];
    if (!start || start.eventTs < startMs || start.eventTs >= endMs) continue;
    // A paid conversion, refund or cancellation removes the chain from the trial pipeline.
    if (chain.some((event) => event.eventTs >= start.eventTs && (
      event.name === "cancellation" || event.isRefund || event.isTrialConversion
      || ((event.name === "renewal" || event.name === "initial_purchase") && event.periodType !== "trial")
    ))) continue;
    if (!Number.isFinite(start.expiresAt)) {
      report.unknownExpiry += 1;
      continue;
    }
    if (start.expiresAt <= asOf) continue;
    const day = Math.floor((asOf - start.eventTs) / DAY_MS);
    report.total += 1;
    if (day <= 7) report.days[day].active += 1;
    else report.older += 1;
  }
  return report;
}
