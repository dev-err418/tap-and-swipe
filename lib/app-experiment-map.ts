import { GLOW_PAYWALL_EXPERIMENT } from "./native-paywall-allocation";

export type ExperimentMapBranch = { id: string; label: string; percent: number };
export type ExperimentMapTest = {
  id: string;
  label: string;
  scope: string;
  tone: "blue" | "orange";
  branches: ExperimentMapBranch[];
  planned?: boolean;
};
export type AppExperimentMapDefinition = {
  tests: ExperimentMapTest[];
  notes: string[];
  combinations?: ExperimentMapBranch[];
};

/**
 * Configuration snapshot, not observed traffic or a remote app configuration.
 * Verified 2026-09-19 against Glow's OnboardingExperiment/GlowProductID,
 * Poky's OnboardingPlanVariant/HomeExperienceVariant, and Poky Superwall iOS
 * campaigns 94968 and 97721. Update this alongside app/campaign allocation changes.
 * Historical result cards are deliberately not the source of active tests.
 */
export function appExperimentMap(appId: string): AppExperimentMapDefinition | null {
  if (appId === "glow") {
    return {
      tests: [
        {
          id: "glow-onboarding-copy", label: "Onboarding", scope: "New onboarding assignments", tone: "blue",
          branches: [
            { id: "iam", label: "IAM", percent: 50 },
            { id: "copy", label: "Copy", percent: 50 },
          ],
        },
        {
          id: GLOW_PAYWALL_EXPERIMENT.id, label: "Native paywalls", scope: "Next app release · English / fallback · Spanish · German", tone: "orange",
          branches: GLOW_PAYWALL_EXPERIMENT.variants.map(({ id, percent }) => ({
            id,
            label: id,
            percent,
          })),
        },
        {
          id: "journal_vs_practice_v1", label: "Journal VS Practice", scope: "Home button · enabled in next app release", tone: "blue",
          branches: [
            { id: "journal", label: "Journal", percent: 30 },
            { id: "practice", label: "Practice", percent: 70 },
          ],
        },
      ],
      notes: [
        "Results start September 20, 2026 at 08:00 GMT+2; earlier cohorts and proceeds are excluded.",
        "V3 starts a new sticky paywall assignment on upgrade; v1/v2 results and pending purchases stay separate. Onboarding assignments are unchanged.",
        "The $34.99 Yearly subscription must be approved before production rollout. This map shows next-release app configuration, not live rollout.",
      ],
    };
  }

  if (appId === "poky") {
    const plan: ExperimentMapTest = {
      id: "poky-animated-plan", label: "Plan flow", scope: "New onboarding assignments", tone: "blue",
      branches: [
        { id: "control", label: "Standard plan", percent: 50 },
        { id: "animated_plan", label: "Animated plan", percent: 50 },
      ],
    };
    const experience: ExperimentMapTest = {
      id: "poky-app-experience", label: "App experience", scope: "Background · next app release", tone: "blue",
      branches: [
        { id: "control", label: "Original", percent: 10 },
        { id: "new_experience", label: "New experience · warm", percent: 90 },
      ],
    };
    return {
      tests: [
        plan,
        experience,
        {
          id: "poky-superwall-vs-native", label: "Paywall engine", scope: "New assignment · all supported languages", tone: "orange",
          branches: [
            { id: "superwall", label: "Superwall paywall", percent: 50 },
            { id: "native", label: "Native paywall", percent: 50 },
          ],
        },
        {
          id: "poky-english-paywalls", label: "Native main paywalls", scope: "Native arm · 🇬🇧 English / fallback", tone: "orange",
          branches: [
            { id: "624224", label: "Onboarding · High - 1", percent: 50 },
            { id: "624761", label: "Onboarding Name - 2", percent: 50 },
          ],
        },
        {
          id: "poky-localized-paywalls", label: "Native localized paywalls", scope: "Native arm · 🇪🇸 Spanish · 🇩🇪 German · 🇫🇷 French", tone: "orange",
          branches: [{ id: "name-2", label: "Name - 2 · each language", percent: 100 }],
        },
        {
          id: "poky-native-recovery-holdout", label: "Native recovery", scope: "Native arm · upfront 50/50 · any origin placement", tone: "orange",
          branches: [
            { id: "recovery", label: "Recovery paywall", percent: 50 },
            { id: "holdout", label: "No recovery", percent: 50 },
          ],
        },
      ],
      combinations: plan.branches.flatMap((p) => experience.branches.map((e) => ({
        id: `${p.id}-${e.id}`,
        label: `${p.label} + ${e.id === "control" ? "original" : "warm"}`,
        percent: p.percent * e.percent / 100,
      }))),
      notes: [
        "Results start September 20, 2026 at 16:00 GMT+2. The App experience card also includes a fixed 30-day pre-split Original baseline.",
        "Paywall engine results start September 24, 2026 at 13:37 GMT+2. Each eligible user receives one saved 50/50 assignment. Earlier Superwall conversions and subscriptions are excluded from this new test.",
        "Background 90/10 applies to new assignments in the next release. Earlier builds use 70/30 or 50/50; saved assignments are unchanged.",
        "The native recovery group is assigned before onboarding within the native paywall arm. Superwall uses its configured campaign and recovery flow. The home-screen shortcut remains available in both arms.",
      ],
    };
  }

  if (appId === "versy") {
    const yearlyPrices = [
      { id: "com.arthurbuildsstuff.bible.yearly_3999_80", label: "$39.99 Yearly" },
      { id: "com.arthurbuildsstuff.bible.yearly_2999_80", label: "$29.99 Yearly" },
      { id: "com.arthurbuildsstuff.bible.yearly_4999_80", label: "$49.99 Yearly" },
    ];
    return {
      tests: [
        {
          id: "versy-bible-widget-v1", label: "Onboarding", scope: "New onboarding assignments · next app release", tone: "blue",
          branches: [
            { id: "short-1-prayer", label: "Prayer journey", percent: 50 },
            { id: "bible_widget", label: "Bible widget", percent: 50 },
          ],
        },
        {
          id: "versy-paywall-layout-v1", label: "Paywall plans", scope: "All paywall placements · independent 50/50 assignment · next app release", tone: "orange",
          branches: [
            { id: "yearly_only", label: "Yearly only", percent: 50 },
            { id: "yearly_weekly", label: "Yearly + Weekly", percent: 50 },
          ],
        },
        {
          id: "versy-paywall-access-v1", label: "Paywall access", scope: "All paywall placements · independent 50/50 assignment · next app release", tone: "orange",
          branches: [
            { id: "dismissible", label: "Dismissible", percent: 50 },
            { id: "hard", label: "Hard paywall", percent: 50 },
          ],
        },
        {
          id: "versy-yearly-price-v1", label: "Yearly price", scope: "All paywall placements · one saved price per user · next app release", tone: "orange",
          branches: yearlyPrices.map(({ id, label }) => ({ id, label, percent: 100 / 3 })),
        },
      ],
      combinations: ["yearly_only", "yearly_weekly"].flatMap((layout) =>
        ["dismissible", "hard"].flatMap((access) => yearlyPrices.map(({ id, label }) => ({
          id: `${layout}|${access}|${id}`,
          label: `${layout === "yearly_only" ? "Yearly only" : "Yearly + Weekly"} · ${access === "hard" ? "Hard" : "Dismissible"} · ${label}`,
          percent: 100 / 12,
        })))),
      notes: [
        "Onboarding, plan layout, access and yearly price are independent saved assignments. The twelve paywall configurations each receive 1/12 of new users; crossing onboarding creates twenty-four paths.",
        "The same yearly product is shown at every paywall placement for a user. Yearly + Weekly also offers com.arthurbuildsstuff.bible.Weekly. The configuration result card compares layout, access and price together.",
        "This map describes the next app release. Existing layout and access assignments remain sticky; existing users receive a yearly price once, and historical users without the new attributes are excluded from price results.",
      ],
    };
  }

  return null;
}

export function activeABTestCount(appId: string) {
  return appExperimentMap(appId)?.tests.filter((experiment) => !experiment.planned && experiment.branches.length > 1).length ?? 0;
}
