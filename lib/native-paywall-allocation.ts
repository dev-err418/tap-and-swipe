/**
 * Mirrors the hardcoded Glow and Poky allocations in app code.
 * Not remote app config or observed traffic. Glow 1.7.2 ships the v3 split,
 * Glow also has a separate US yearly-only presentation cohort through October 11, 2026.
 * Historical native_yearly_v1 retains its original 50/50 allocation.
 */
export const GLOW_PAYWALL_EXPERIMENT = {
  id: "native_paywalls_v3",
  name: "Native paywalls · 5 variants",
  variants: [
    { id: "yr_49", percent: 100 / 6 },
    { id: "yr_59", percent: 100 / 6 },
    { id: "yr_34", percent: 100 / 6 },
    { id: "yr_wk_59", percent: 25 },
    { id: "yr_wk_34", percent: 25 },
  ],
} as const;

/** US reference prices for the annual price/trial combinations. */
export const GLOW_YEARLY_PRICES = [
  { id: "yr_34", price: "$34.99/year (7d)" },
  { id: "yr_49", price: "$49.99/year (7d)" },
  { id: "yr_59", price: "$59.99/year (7d)" },
  { id: "yr_34_3d", price: "$34.99/year (3d)" },
  { id: "yr_49_3d", price: "$49.99/year (3d)" },
  { id: "yr_59_3d", price: "$59.99/year (3d)" },
] as const;

export const GLOW_PREVIOUS_YEARLY_PRICE_EXPERIMENT = "native_yearly_prices_v4";

export const GLOW_YEARLY_PRICE_EXPERIMENT = {
  id: "native_yearly_prices_v5",
  name: "Yearly prices · 3-day vs 7-day trials",
  variants: GLOW_YEARLY_PRICES.map(({ id }) => ({ id, percent: 100 / 6 })),
} as const;

export function glowYearlyPrice(variant: string, paywall: string): string | null {
  const match = GLOW_YEARLY_PRICES.find(({ id }) => (variant === id || variant === `${id}|${id}`) && paywall === id);
  return match?.price ?? null;
}

export function formatPaywallAllocation(percent: number): string {
  return Math.abs(percent - 100 / 6) < 1e-9 ? "~17%" : `${Number(percent.toFixed(2))}%`;
}

const allocations = [
  { experiment: "versy_daily_gift_v1", variant: "daily_gift", paywall: "daily_gift", percent: 100 },
  ...["en", "es", "de", "fr"].map((language) => ({
    experiment: `poky_native_recovery_v3_${language}`, variant: "recovery", paywall: "recovery", percent: 100,
  })),
  ...["en", "es", "de", "fr"].flatMap((language) => ["holdout", "recovery"].map((variant) => ({
    experiment: `poky_native_recovery_v2_${language}`, variant, paywall: variant, percent: 50,
  }))),
  ...GLOW_PAYWALL_EXPERIMENT.variants.map(({ id, percent }) => ({
    experiment: GLOW_PAYWALL_EXPERIMENT.id, variant: id, paywall: id, percent,
  })),
  ...GLOW_YEARLY_PRICE_EXPERIMENT.variants.map(({ id, percent }) => ({
    experiment: GLOW_YEARLY_PRICE_EXPERIMENT.id, variant: id, paywall: id, percent,
  })),
  ...GLOW_YEARLY_PRICES.slice(0, 3).map(({ id }) => ({
    experiment: GLOW_PREVIOUS_YEARLY_PRICE_EXPERIMENT, variant: id, paywall: id, percent: 100 / 3,
  })),
  { experiment: "native_paywall_legacy_en_sep2026", variant: "yr_59", paywall: "yr_59", language: "en", percent: 100 },
  { experiment: "native_yearly_v1", variant: "annual", paywall: "native_timeline_annual_v1", percent: 50 },
  { experiment: "native_yearly_v1", variant: "pro_yearly", paywall: "native_timeline_pro_yearly_v1", percent: 50 },
  { experiment: "native_paywalls_v2", variant: "yr_49", paywall: "yr_49", percent: 25 },
  { experiment: "native_paywalls_v2", variant: "yr_59", paywall: "yr_59", percent: 25 },
  { experiment: "native_paywalls_v2", variant: "yr_wk_59", paywall: "yr_wk_59", percent: 50 },
  { experiment: "poky_native_main_v1_en", variant: "high", paywall: "high", language: "en", percent: 50 },
  { experiment: "poky_native_main_v1_en", variant: "name", paywall: "name", language: "en", percent: 50 },
  { experiment: "poky_native_main_v1_de", variant: "name", paywall: "name", language: "de", percent: 100 },
  { experiment: "poky_native_main_v1_es", variant: "name", paywall: "name", language: "es", percent: 100 },
  { experiment: "poky_native_main_v1_fr", variant: "name", paywall: "name", language: "fr", percent: 100 },
  { experiment: "poky_native_recovery_v1_en", variant: "recovery", paywall: "recovery", percent: 50 },
  { experiment: "poky_native_recovery_v1_en", variant: "holdout", paywall: "holdout", percent: 50 },
  { experiment: "poky_native_recovery_v1_de", variant: "recovery", paywall: "recovery", percent: 50 },
  { experiment: "poky_native_recovery_v1_de", variant: "holdout", paywall: "holdout", percent: 50 },
  { experiment: "poky_native_recovery_v1_es", variant: "recovery", paywall: "recovery", percent: 50 },
  { experiment: "poky_native_recovery_v1_es", variant: "holdout", paywall: "holdout", percent: 50 },
  { experiment: "poky_native_recovery_v1_fr", variant: "recovery", paywall: "recovery", percent: 50 },
  { experiment: "poky_native_recovery_v1_fr", variant: "holdout", paywall: "holdout", percent: 50 },
  { experiment: "poky_context_recovery_v1_en", variant: "recovery", paywall: "recovery", language: "en", percent: 100 },
  { experiment: "poky_context_recovery_v1_de", variant: "recovery", paywall: "recovery", language: "de", percent: 100 },
  { experiment: "poky_context_recovery_v1_es", variant: "recovery", paywall: "recovery", language: "es", percent: 100 },
  { experiment: "poky_context_recovery_v1_fr", variant: "recovery", paywall: "recovery", language: "fr", percent: 100 },
] as const;

export function nativePaywallAllocation(experiment: string, variant: string, paywall: string, language?: string): number | null {
  return allocations.find((allocation) => allocation.experiment === experiment
    && (allocation.variant === variant || `${allocation.variant}|${allocation.paywall}` === variant)
    && allocation.paywall === paywall
    && (!("language" in allocation) || allocation.language === language))?.percent ?? null;
}
