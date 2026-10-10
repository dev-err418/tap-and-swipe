// Display the result cards in the same progression as the experiment map.
// These independent assignments are not sequential enrolment conditions.
const experimentOrder: Record<string, readonly string[]> = {
  glow: ["glow-onboarding-copy", "glow-native-paywall", "glow-yearly-price"],
  poky: ["poky-plan-design-combinations", "poky-animated-plan", "poky-trial-vs-current"],
  versy: ["versy-scroll-the-bible-v1", "versy-scroll-the-bible-v1-mexico", "versy-scroll-the-bible-v1-unknown", "versy-bible-widget-shorter-v1", "versy-yearly-paywall-access-v1",
    "versy-yearly-price-v2", "versy-yearly-paywall-configuration-v2"],
};

export function orderAppExperiments<T extends { id: string }>(appId: string, experiments: readonly T[]): T[] {
  const order = experimentOrder[appId] ?? [];
  const rank = (id: string) => {
    const index = order.indexOf(id);
    return index < 0 ? order.length : index;
  };
  return [...experiments].sort((a, b) => rank(a.id) - rank(b.id));
}
