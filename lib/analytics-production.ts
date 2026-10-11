/** Sandbox filtering happens in SQL; this additionally requires the app's production marker. */
export function productionAnalyticsFilter(
  attributes: Map<string, Record<string, string>>,
  environmentKey: string | null,
  events: { appUserId: string; originalTransactionId: string; name: string }[],
) {
  const user = (id: string) => !environmentKey || attributes.get(id)?.[environmentKey]?.trim().toLowerCase() === "production";
  const chains = new Set(events.filter((row) => row.name === "initial_purchase" && user(row.appUserId))
    .map((row) => row.originalTransactionId).filter(Boolean));
  return {
    user,
    event: (row: { appUserId: string; originalTransactionId: string }) => user(row.appUserId)
      || (!row.appUserId && chains.has(row.originalTransactionId)),
  };
}
