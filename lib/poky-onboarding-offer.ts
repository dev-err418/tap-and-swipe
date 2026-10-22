export const POKY_ONBOARDING_OFFER_EXPERIMENT = "poky_onboarding_trial_v2";
export const POKY_LEGACY_OFFER_EXPERIMENT = "poky_onboarding_trial_v1";
export const POKY_OFFER_ALLOCATION = "25_25_50";
export const POKY_OFFER_VARIANTS = [
  { key: "current", label: "HP (hard paywall)", percent: 25, product: null },
  { key: "trial", label: "3-day trial", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial" },
  { key: "trial_7d", label: "7-day trial", percent: 50, product: "arthurbuildsstuff.peptides.yearly.trial7" },
] as const;

export function pokyOfferVariants(legacy = false) {
  return legacy ? POKY_OFFER_VARIANTS.slice(0, 2) : [...POKY_OFFER_VARIANTS];
}

export function isPokyOfferAssignment(values: Record<string, string> | undefined, legacy = false): boolean {
  return values?.poky_tracking_environment === "production"
    && values.onboarding_offer_experiment === (legacy ? POKY_LEGACY_OFFER_EXPERIMENT : POKY_ONBOARDING_OFFER_EXPERIMENT)
    && values.onboarding_offer_allocation === (legacy ? "50_50" : POKY_OFFER_ALLOCATION)
    && pokyOfferVariants(legacy).some((variant) => variant.key === values.onboarding_offer_variant);
}
