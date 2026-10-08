/** The app does not publish an immutable assignment-country attribute yet. */
export function versyOnboardingAudience(installCountry: string, attributes?: Record<string, string>): "comparison" | "mexico" | "unknown" {
  const install = installCountry.trim().toUpperCase();
  const reported = attributes?.country?.trim().toUpperCase();
  // Either source identifying Mexico excludes the user from winner calculations.
  if (install === "MX" || reported === "MX") return "mexico";
  if (!/^[A-Z]{2}$/.test(install) || install === "XX"
    || !reported || !/^[A-Z]{2}$/.test(reported) || reported === "XX" || reported !== install) return "unknown";
  return "comparison";
}

export function versyOnboardingPaywallReached(attributes?: Record<string, string>): boolean {
  const key = attributes?.onboarding_variant === "scroll_the_bible"
    ? "scroll_bible_trial_screen_seen" : "bible_widget_paywall_screen_seen";
  return ["true", "1"].includes(attributes?.[key] ?? "");
}
