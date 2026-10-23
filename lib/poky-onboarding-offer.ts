export const POKY_ONBOARDING_OFFER_EXPERIMENT = "poky_onboarding_trial_v3";
export const POKY_PREVIOUS_OFFER_EXPERIMENT = "poky_onboarding_trial_v2";
export const POKY_LEGACY_OFFER_EXPERIMENT = "poky_onboarding_trial_v1";
export const POKY_OFFER_ALLOCATION = "25_25_25_25";
export const POKY_OFFER_VARIANTS = [
  { key: "current", label: "HP (hard paywall)", percent: 25, product: null },
  { key: "trial", label: "3-day trial", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial" },
  { key: "trial_7d", label: "7-day trial · current", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial7" },
  { key: "trial_7d_mascot", label: "7-day trial · mascot", percent: 25, product: "arthurbuildsstuff.peptides.yearly.trial7" },
] as const;
const POKY_OFFER_RELEASES = [
  { experiment: POKY_LEGACY_OFFER_EXPERIMENT, allocation: "50_50", variants: POKY_OFFER_VARIANTS.slice(0, 2) },
  { experiment: POKY_PREVIOUS_OFFER_EXPERIMENT, allocation: "25_25_50", variants: POKY_OFFER_VARIANTS.slice(0, 3) },
  { experiment: POKY_ONBOARDING_OFFER_EXPERIMENT, allocation: POKY_OFFER_ALLOCATION, variants: POKY_OFFER_VARIANTS },
];

export function pokyOfferVariants() {
  return [...POKY_OFFER_VARIANTS];
}

/** Pool unchanged treatments across releases, validating each original allocation. */
export function isPokyOfferAssignment(values: Record<string, string> | undefined): boolean {
  if (values?.poky_tracking_environment !== "production"
    || ["true", "1"].includes(values.poky_us_hp_override_seen ?? "")) return false;
  return POKY_OFFER_RELEASES.some((release) => values.onboarding_offer_experiment === release.experiment
    && values.onboarding_offer_allocation === release.allocation
    && release.variants.some((variant) => variant.key === values.onboarding_offer_variant));
}
