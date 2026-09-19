/**
 * Mirrors GlowPaywallVariant's hardcoded allocation in the next app release.
 * Not remote app config, observed traffic, or confirmation of App Store rollout.
 * Historical native_yearly_v1 retains its original 50/50 allocation.
 */
const allocations = [
  { experiment: "native_yearly_v1", variant: "annual", paywall: "native_timeline_annual_v1", percent: 50 },
  { experiment: "native_yearly_v1", variant: "pro_yearly", paywall: "native_timeline_pro_yearly_v1", percent: 50 },
  { experiment: "native_paywalls_v2", variant: "yr_49", paywall: "yr_49", percent: 25 },
  { experiment: "native_paywalls_v2", variant: "yr_59", paywall: "yr_59", percent: 25 },
  { experiment: "native_paywalls_v2", variant: "yr_wk_59", paywall: "yr_wk_59", percent: 50 },
] as const;

export function nativePaywallAllocation(experiment: string, variant: string, paywall: string): number | null {
  return allocations.find((allocation) => allocation.experiment === experiment
    && (allocation.variant === variant || `${allocation.variant}|${allocation.paywall}` === variant)
    && allocation.paywall === paywall)?.percent ?? null;
}
