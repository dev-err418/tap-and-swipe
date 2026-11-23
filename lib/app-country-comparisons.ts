import { analyticsCountryOptions, type AnalyticsCountryOption } from "./analytics-country-options";
import { marketCountry } from "./analytics-markets";
import { experimentInstallCohort, experimentMinimumInstallVersion } from "./app-experiment-cohort";
import { buildGlowPaywallCohortComparisons, type GlowPaywallCohortComparisons, type PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";
import { buildPokyPaywallFlowComparison } from "./poky-paywall-flow-cohorts";
import { buildVersyPaywallComparison, type VersyPaywallComparison } from "./versy-paywall-comparison";
import { buildVersyYearlyPriceComparison, type VersyYearlyPriceComparison } from "./versy-yearly-price-cohorts";
import { installCohortTrialSurvival } from "./install-cohort-trial-survival";
import { withJourneyConversions } from "./journey-cohort-conversions";
import { buildUserJourney, userJourneyDefinition, type UserJourneyReport } from "./user-journey";
import type { TrialCancelTiming } from "./mobile-app-analytics";
import { VERSY_ANDROID_INSTALL_VERSION, type VersyAnalyticsPlatform } from "./versy-analytics-platform";

export type AppCountryComparisonSlice = {
  userJourney: UserJourneyReport | null;
  paywallCohortComparisons: GlowPaywallCohortComparisons | null;
  yearlyPriceComparison: VersyYearlyPriceComparison | null;
  versyPaywallComparison: VersyPaywallComparison | null;
  paywallFlowComparison: PaywallCohortComparison | null;
  trialCancelTiming: TrialCancelTiming | null;
};
export type AppCountryComparisons = { options: AnalyticsCountryOption[]; slices: Record<string, AppCountryComparisonSlice> };
type Install = Parameters<typeof withJourneyConversions>[2][number] & { country: string };
type Event = Parameters<typeof installCohortTrialSurvival>[1][number] & Parameters<typeof withJourneyConversions>[3][number];

/** Aggregate each country independently; no user identities or raw transactions leave the server. */
export function buildAppCountryComparisons(input: {
  appId: "glow" | "poky" | "versy"; installs: Install[]; events: Event[];
  countries: Parameters<typeof analyticsCountryOptions>[1];
  attributes: Map<string, Record<string, string>>; asOf: number;
  journey: UserJourneyReport | null; journeyCountries?: Record<string, UserJourneyReport>;
  platform?: VersyAnalyticsPlatform;
}): AppCountryComparisons {
  const minimum = input.platform === "android" ? VERSY_ANDROID_INSTALL_VERSION : experimentMinimumInstallVersion(input.appId)!;
  const eligible = experimentInstallCohort(input.installs, minimum, input.asOf);
  const options = analyticsCountryOptions(input.appId, input.countries);
  const slices = Object.fromEntries(options.map(({ code }) => {
    const members = eligible.filter((install) => marketCountry(install.country) === code);
    const definition = userJourneyDefinition(input.appId)!;
    const journey = input.platform === "android" ? input.journeyCountries?.[code] ?? (input.journey?.status === "unavailable" ? input.journey : null)
      : input.journey && (input.journey.status === "ready" || input.journey.status === "empty")
      ? input.journeyCountries?.[code] ?? buildUserJourney(definition, []) : input.journey;
    const userJourney = journey && input.platform !== "android" ? withJourneyConversions(journey, input.appId, members, input.events,
      input.attributes, 0, input.asOf + 1, input.asOf) : journey;
    const slice: AppCountryComparisonSlice = {
      userJourney,
      paywallCohortComparisons: input.appId === "glow"
        ? buildGlowPaywallCohortComparisons(members, input.events, input.attributes, 0, input.asOf + 1, input.asOf) : null,
      yearlyPriceComparison: input.appId === "versy"
        ? buildVersyYearlyPriceComparison(members, input.events, input.attributes, input.asOf, input.platform) : null,
      versyPaywallComparison: input.appId === "versy"
        ? buildVersyPaywallComparison(members, input.events, input.attributes, input.asOf, input.platform) : null,
      paywallFlowComparison: input.appId === "poky"
        ? buildPokyPaywallFlowComparison(members, input.events, input.attributes, 0, input.asOf + 1, input.asOf) : null,
      trialCancelTiming: input.appId !== "poky" ? installCohortTrialSurvival(members, input.events, minimum, input.asOf) : null,
    };
    return [code, slice];
  }));
  return { options, slices };
}
