/**
 * Mirrors the hardcoded Glow and Poky allocations in app code.
 * Not remote app config or observed traffic. Glow 1.7.2 ships the v3 split,
 * with a temporary English presentation override through September 26, 2026.
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

export function formatPaywallAllocation(percent: number): string {
  return Math.abs(percent - 100 / 6) < 1e-9 ? "~17%" : `${Number(percent.toFixed(2))}%`;
}

const allocations = [
  ...["en", "es", "de", "fr"].flatMap((language) => ["holdout", "recovery"].map((variant) => ({
    experiment: `poky_native_recovery_v2_${language}`, variant, paywall: variant, percent: 50,
  }))),
  ...GLOW_PAYWALL_EXPERIMENT.variants.map(({ id, percent }) => ({
    experiment: GLOW_PAYWALL_EXPERIMENT.id, variant: id, paywall: id, percent,
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
