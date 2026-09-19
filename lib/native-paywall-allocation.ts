/**
 * Mirrors the hardcoded Glow and Poky allocations in released app code.
 * Not remote app config, observed traffic, or confirmation of App Store rollout.
 * Historical native_yearly_v1 retains its original 50/50 allocation.
 */
const allocations = [
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
