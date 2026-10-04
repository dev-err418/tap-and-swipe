type VariantRows = readonly { variant: string }[];

export function activeWebsiteABTestCount(analytics: {
  pricingExperiment?: VariantRows;
  heroPreviewExperiment?: VariantRows;
  trialExperiment?: VariantRows;
  onboardingExperiment?: VariantRows;
  ctaExperiment?: readonly { experiment: string; page: string; placement: string; variant: string }[];
}) {
  const websiteTests = [
    analytics.pricingExperiment,
    analytics.heroPreviewExperiment,
    analytics.trialExperiment,
    analytics.onboardingExperiment,
  ].filter((rows) => new Set(rows?.map((row) => row.variant) ?? []).size > 1).length;
  const ctaTests = new Map<string, Set<string>>();
  for (const row of analytics.ctaExperiment ?? []) {
    const key = `${row.experiment}:${row.page}:${row.placement}`;
    const variants = ctaTests.get(key) ?? new Set<string>();
    variants.add(row.variant);
    ctaTests.set(key, variants);
  }
  return websiteTests + [...ctaTests.values()].filter((variants) => variants.size > 1).length;
}
