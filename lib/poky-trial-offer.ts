import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";

export const POKY_TRIAL_OFFER_ATTRIBUTE_KEYS = [
  "onboarding_offer_experiment",
  "onboarding_offer_variant",
  "onboarding_offer_assigned_at",
  "onboarding_offer_allocation",
  "onboarding_offer_language",
] as const;

const EXPERIMENT = "poky_onboarding_trial_v1";
const TRIAL_PRODUCT = "arthurbuildsstuff.peptides.yearly.trial";
type Arm = "current" | "trial";
type Language = "en" | "es" | "de" | "fr";
type Install = { appUserId: string; country: string; installedAt: number; language?: string };
type Outcome = {
  appUserId: string; eventTs: number; name: string; netProceeds: number | null;
  originalTransactionId: string; transactionId: string; attributionTs: number;
  isRefund: boolean; productId: string; periodType: string;
};
type Facts = {
  startMs: number; endMs: number; installs: Install[]; events: Outcome[];
  attributes: Map<string, Record<string, string>>;
};

const empty = (): MobileAppExperimentSlice => ({ users: 0, sessions: 0, installs: 0, completed: 0, trials: 0, converted: 0, paid: 0, proceeds: 0, installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0, installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 });
const variants = (): MobileAppExperimentVariant[] => [
  { ...empty(), key: "current", label: "Current paywall", countries: {} },
  { ...empty(), key: "trial", label: "3-day trial · native", countries: {} },
];

/** Assignment time selects the cohort; Apple money follows each new subscription through today. */
export function pokyTrialOfferExperiment(facts: Facts, asOf = Date.now()): MobileAppExperiment {
  const overall = variants();
  const languageComparisons = ([
    ["en", "🇬🇧 English APPU"], ["es", "🇪🇸 Spanish APPU"],
    ["de", "🇩🇪 German APPU"], ["fr", "🇫🇷 French APPU"],
  ] as const).map(([language, label]) => ({ language, label, variants: variants() }));
  const firstInstalls = new Map<string, Install>();
  for (const install of facts.installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt)) continue;
    if ((firstInstalls.get(install.appUserId)?.installedAt ?? Infinity) > install.installedAt) {
      firstInstalls.set(install.appUserId, install);
    }
  }

  const cohort = new Map<string, { assignedAt: number; slices: MobileAppExperimentSlice[] }>();
  for (const [appUserId, attrs] of facts.attributes) {
    const variant = attrs.onboarding_offer_variant;
    const assignedAt = Number(attrs.onboarding_offer_assigned_at);
    if (attrs.onboarding_offer_experiment !== EXPERIMENT ||
        attrs.onboarding_offer_allocation !== "50_50" ||
        (variant !== "current" && variant !== "trial") ||
        attrs.poky_tracking_environment !== "production" ||
        !Number.isFinite(assignedAt) || assignedAt <= 0 ||
        assignedAt < facts.startMs || assignedAt >= facts.endMs || assignedAt > asOf) continue;
    const arm: Arm = variant;
    const index = arm === "current" ? 0 : 1;
    const country = firstInstalls.get(appUserId)?.country ?? "unknown";
    const language = attrs.onboarding_offer_language as Language | undefined;
    const localized = languageComparisons.find((row) => row.language === language);
    const slices = [overall[index], ...(localized ? [localized.variants[index]] : [])]
      .flatMap((row) => [row, row.countries[country] ??= empty()]);
    for (const slice of slices) { slice.users++; slice.installs++; }
    cohort.set(appUserId, { assignedAt, slices });
  }

  const eligibleOriginals = new Set<string>();
  const trialUsers = new Set<string>();
  for (const event of facts.events) {
    const user = cohort.get(event.appUserId);
    if (!user || !event.originalTransactionId || !Number.isFinite(event.eventTs) ||
        event.eventTs < user.assignedAt || event.eventTs > asOf || event.isRefund ||
        !["initial_purchase", "non_renewing_purchase"].includes(event.name)) continue;
    eligibleOriginals.add(`${event.appUserId}|${event.originalTransactionId}`);
    if (event.name === "initial_purchase" && event.productId === TRIAL_PRODUCT && event.periodType === "trial") {
      trialUsers.add(event.appUserId);
    }
  }
  for (const appUserId of trialUsers) for (const slice of cohort.get(appUserId)!.slices) slice.trials++;

  const unique = new Map<string, Outcome>();
  for (const event of facts.events) {
    const user = cohort.get(event.appUserId);
    if (!user || !eligibleOriginals.has(`${event.appUserId}|${event.originalTransactionId}`) ||
        !event.transactionId || !Number.isFinite(event.eventTs) ||
        event.eventTs < user.assignedAt || event.eventTs > asOf) continue;
    if (!event.isRefund && !["initial_purchase", "renewal", "non_renewing_purchase", "cancellation"].includes(event.name)) continue;
    if (event.name === "cancellation" && !event.isRefund) continue;
    const key = `${event.appUserId}|${event.originalTransactionId}|${event.transactionId}|${event.isRefund}`;
    if ((unique.get(key)?.attributionTs ?? -Infinity) < event.attributionTs) unique.set(key, event);
  }
  const paid = new Set<string>();
  const converted = new Set<string>();
  const userProceeds = new Map<string, number>();
  for (const event of unique.values()) {
    const user = cohort.get(event.appUserId);
    if (!user || event.netProceeds == null || !Number.isFinite(event.netProceeds)) continue;
    userProceeds.set(event.appUserId, (userProceeds.get(event.appUserId) ?? 0) + event.netProceeds);
    const firstPaid = event.netProceeds > 0 && !paid.has(event.appUserId);
    const firstConversion = firstPaid && trialUsers.has(event.appUserId) && !converted.has(event.appUserId);
    if (firstPaid) paid.add(event.appUserId);
    if (firstConversion) converted.add(event.appUserId);
    for (const slice of user.slices) {
      slice.proceeds += event.netProceeds;
      if (firstPaid) slice.paid++;
      if (firstConversion) slice.converted++;
    }
  }
  const squaredProceeds = new Map<MobileAppExperimentSlice, number>();
  for (const [appUserId, user] of cohort) {
    const amount = userProceeds.get(appUserId) ?? 0;
    for (const slice of user.slices) squaredProceeds.set(slice, (squaredProceeds.get(slice) ?? 0) + amount * amount);
  }
  for (const [slice, sumOfSquares] of squaredProceeds) {
    slice.proceedsVariance = slice.users > 1
      ? Math.max(0, (sumOfSquares - slice.proceeds * slice.proceeds / slice.users) / (slice.users - 1)) : 0;
  }
  return {
    id: "poky-trial-vs-current", title: "Paywalls · 3-day trial vs current",
    subtitle: "Fresh 50/50 assignment · one hardcoded trial paywall · all four languages",
    planningNote: "Trial starts are free. APPU includes later paid renewals and refunds from subscriptions that began after assignment. All assigned users count, including people who never opened a paywall. Legacy assignments and sandbox events are excluded.",
    variants: overall, languageComparisons,
    languageVariants: Object.fromEntries(languageComparisons.map((row) => [row.language, row.variants])),
    scoreMetrics: ["appu", "download_paid"], randomized: true,
    showUsers: true, showInstalls: false, showTrials: true, trialRateLabel: "Assigned → trial",
    paidRateLabel: "Assigned → paid",
  };
}
