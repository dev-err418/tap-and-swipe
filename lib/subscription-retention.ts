type SubscriptionEvent = {
  name: string;
  isRefund: boolean;
  eventTs: number;
  expiresAt: number;
};

/** Whether a subscription has an uncancelled trial or paid term at a checkpoint. */
export function subscriptionActiveAt(events: SubscriptionEvent[], checkpoint: number) {
  const lastStop = Math.max(Number.NEGATIVE_INFINITY, ...events
    .filter((event) => event.eventTs <= checkpoint && (event.name === "cancellation" || event.isRefund))
    .map((event) => event.eventTs));
  return events.some((event) =>
    (event.name === "initial_purchase" || event.name === "renewal") && !event.isRefund
    && event.eventTs <= checkpoint && event.eventTs > lastStop && event.expiresAt > checkpoint);
}
