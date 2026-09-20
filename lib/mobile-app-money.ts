const CHARGE_EVENT_NAMES = new Set(["initial_purchase", "renewal", "non_renewing_purchase"]);

type MobileMoneyEvent = {
  name: string;
  netProceeds: number | null;
};

/**
 * Superwall can deliver a refund as a cancellation rather than as a purchase
 * event. Only negative cancellation proceeds are money; ordinary subscription
 * cancellations must not change revenue.
 */
export function isMobileMoneyEvent(event: MobileMoneyEvent) {
  return CHARGE_EVENT_NAMES.has(event.name) || (event.netProceeds != null && event.netProceeds < 0);
}
