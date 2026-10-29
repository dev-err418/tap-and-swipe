/** Next iOS release: fixed policy IDs are distinct from retired randomized assignments. */
export const VERSY_FIXED_YEARLY_PRICE = {
  experiment: "versy_yearly_price_fixed_4999_v1",
  allocation: "fixed_4999",
  productID: "com.arthurbuildsstuff.bible.yearly_4999",
  key: "yearly_4999",
  label: "$49.99/year (7d)",
} as const;
export const VERSY_HARD_PAYWALL_EXPERIMENT = "versy_yearly_hard_paywalls_v1";

export function isVersyFixedYearlyPriceAssignment(values: Record<string, string> | undefined): boolean {
  return values?.versy_tracking_environment === "production"
    && values.yearly_price_experiment_id === VERSY_FIXED_YEARLY_PRICE.experiment
    && values.yearly_price_allocation === VERSY_FIXED_YEARLY_PRICE.allocation
    && values.yearly_price_product_id === VERSY_FIXED_YEARLY_PRICE.productID;
}

/** Scroll has its own dismissible paywall; never infer its access from Widget attributes. */
export function versyWidgetPaywallAccess(values: Record<string, string>): "hard" | "dismissible" | null {
  if (!["bible_widget", "bible_widget_shorter"].includes(values.onboarding_variant)) return null;
  if (values.onboarding_paywall_experiment_id === VERSY_HARD_PAYWALL_EXPERIMENT) {
    return values.onboarding_paywall_access_variant === "hard" ? "hard" : null;
  }
  if (values.onboarding_paywall_experiment_id !== "versy_yearly_paywalls_v1") return null;
  const access = values.onboarding_paywall_access_variant;
  return access === "hard" || access === "dismissible" ? access : null;
}
