const DAY = 86_400_000;

type RevenueEvent = {
  appUserId: string;
  name: string;
  eventTs: number;
  expiresAt: number;
  netProceeds: number | null;
  isRefund: boolean;
  originalTransactionId: string;
  transactionId: string;
};

type SessionStart = { id: string; appUserId: string; eventTs: number };
type Interval = { from: number; to: number };

/** Activity during paid entitlement, excluding trial-only and expired time. */
export function paidSubscriptionActivity(
  revenue: RevenueEvent[], sessions: SessionStart[], from: number, to: number,
) {
  const charges = new Map<string, { owner: string; original: string; interval: Interval }>();
  for (const event of revenue) {
    if (!event.appUserId || !event.originalTransactionId || !event.transactionId
      || !["initial_purchase", "renewal"].includes(event.name)
      || !(event.netProceeds != null && event.netProceeds > 0)
      || !Number.isFinite(event.eventTs) || !Number.isFinite(event.expiresAt)
      || event.expiresAt <= event.eventTs) continue;
    const key = `${event.originalTransactionId}|${event.transactionId}`;
    const previous = charges.get(key);
    if (!previous || event.expiresAt > previous.interval.to) charges.set(key, {
      owner: event.appUserId, original: event.originalTransactionId,
      interval: { from: event.eventTs, to: event.expiresAt },
    });
  }
  for (const event of revenue) {
    if (!(event.isRefund || event.name === "cancellation") || !Number.isFinite(event.eventTs)) continue;
    const charge = charges.get(`${event.originalTransactionId}|${event.transactionId}`);
    if (charge && (!event.appUserId || event.appUserId === charge.owner)
      && charge.interval.from <= event.eventTs && charge.interval.to > event.eventTs) {
      charge.interval.to = Math.min(charge.interval.to, event.eventTs);
      continue;
    }
    // Some cancellation events refer to the subscription chain rather than the
    // latest renewal transaction. Stop whichever paid term was active then.
    for (const candidate of charges.values()) {
      if (candidate.original !== event.originalTransactionId
        || (event.appUserId && candidate.owner !== event.appUserId)
        || candidate.interval.from > event.eventTs || candidate.interval.to <= event.eventTs) continue;
      candidate.interval.to = event.eventTs;
    }
  }
  const intervals = new Map<string, Interval[]>();
  for (const { owner, interval } of charges.values()) {
    const start = Math.max(from, interval.from);
    const end = Math.min(to, interval.to);
    if (end > start) intervals.set(owner, [...intervals.get(owner) ?? [], { from: start, to: end }]);
  }
  const activity = new Map<string, { sessions: number; sessionUserDays: number }>();
  for (const [owner, ranges] of intervals) {
    ranges.sort((a, b) => a.from - b.from);
    const merged: Interval[] = [];
    for (const range of ranges) {
      const last = merged.at(-1);
      if (last && range.from <= last.to) last.to = Math.max(last.to, range.to);
      else merged.push({ ...range });
    }
    intervals.set(owner, merged);
    activity.set(owner, { sessions: 0,
      sessionUserDays: merged.reduce((sum, range) => sum + (range.to - range.from) / DAY, 0) });
  }
  const uniqueStarts = new Map<string, SessionStart>();
  for (const session of sessions) if (session.id && session.appUserId && Number.isFinite(session.eventTs)
    && session.eventTs >= from && session.eventTs < to) uniqueStarts.set(session.id, session);
  for (const session of uniqueStarts.values()) {
    if (intervals.get(session.appUserId)?.some((range) => session.eventTs >= range.from && session.eventTs < range.to)) {
      activity.get(session.appUserId)!.sessions++;
    }
  }
  return activity;
}
