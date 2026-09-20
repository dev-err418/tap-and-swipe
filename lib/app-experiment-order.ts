// Display the result cards in the same progression as the experiment map.
// These independent assignments are not sequential enrolment conditions.
const experimentOrder: Record<string, readonly string[]> = {
  glow: ["glow-onboarding-copy", "glow-native-paywall", "glow-yearly-price"],
  poky: ["poky-app-experience", "poky-animated-plan", "poky-onboarding-abcd", "poky-superwall-vs-native", "poky-native-recovery-holdout"],
};

export function orderAppExperiments<T extends { id: string }>(appId: string, experiments: readonly T[]): T[] {
  const order = experimentOrder[appId] ?? [];
  const rank = (id: string) => {
    const index = order.indexOf(id);
    return index < 0 ? order.length : index;
  };
  return [...experiments].sort((a, b) => rank(a.id) - rank(b.id));
}
