export const POKY_ONBOARDING_OFFER_EXPERIMENT = "poky_onboarding_trial_v3";
export const POKY_PREVIOUS_OFFER_EXPERIMENT = "poky_onboarding_trial_v2";
export const POKY_LEGACY_OFFER_EXPERIMENT = "poky_onboarding_trial_v1";
export const POKY_OFFER_ALLOCATION = "25_25_25_25";
// Booleans retain the original API: true selects the historical 50/50 test.
export type PokyOfferHistory = boolean | "v2";
export const POKY_OFFER_VARIANTS = [
  { key: "current", label: "HP (hard paywall)", percent: 25, product: null },
  { key: "trial", label: "3-day trial", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial" },
  { key: "trial_7d", label: "7-day trial · current", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial7" },
  { key: "trial_7d_mascot", label: "7-day trial · mascot", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial7" },
] as const;

export function pokyOfferVariants(history: PokyOfferHistory = false) {
  if (history === true) return POKY_OFFER_VARIANTS.slice(0, 2);
  if (history === "v2") return POKY_OFFER_VARIANTS.slice(0, 3).map((variant) => variant.key === "trial_7d"
    ? { ...variant, label: "7-day trial", percent: 50 } : variant);
  return [...POKY_OFFER_VARIANTS];
}

export function isPokyOfferAssignment(values: Record<string, string> | undefined, history: PokyOfferHistory = false): boolean {
  return values?.poky_tracking_environment === "production"
    && !["true", "1"].includes(values.poky_us_hp_override_seen ?? "")
    && values.onboarding_offer_experiment === (history === true ? POKY_LEGACY_OFFER_EXPERIMENT : history === "v2" ? POKY_PREVIOUS_OFFER_EXPERIMENT : POKY_ONBOARDING_OFFER_EXPERIMENT)
    && values.onboarding_offer_allocation === (history === true ? "50_50" : history === "v2" ? "25_25_50" : POKY_OFFER_ALLOCATION)
    && pokyOfferVariants(history).some((variant) => variant.key === values.onboarding_offer_variant);
}
