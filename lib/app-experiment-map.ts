import { GLOW_PAYWALL_EXPERIMENT } from "./native-paywall-allocation";

export type ExperimentMapBranch = { id: string; label: string; percent: number };
export type ExperimentMapTest = {
  id: string;
  label: string;
  scope: string;
  tone: "blue" | "orange";
  branches: ExperimentMapBranch[];
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
        { id: "control", label: "Original", percent: 50 },
        { id: "new_experience", label: "New experience · warm", percent: 50 },
      ],
    };
    return {
      tests: [
        plan,
        experience,
        {
          id: "poky-english-paywalls", label: "Main paywalls", scope: "🇬🇧 English / fallback", tone: "orange",
          branches: [
            { id: "624224", label: "Onboarding · High - 1", percent: 50 },
            { id: "624761", label: "Onboarding Name - 2", percent: 50 },
          ],
        },
        {
          id: "poky-localized-paywalls", label: "Localized paywalls", scope: "🇪🇸 Spanish · 🇩🇪 German · 🇫🇷 French", tone: "orange",
          branches: [{ id: "name-2", label: "Name - 2 · each language", percent: 100 }],
        },
        {
          id: "poky-native-recovery-holdout", label: "Recovery", scope: "Hardcoded paywalls · upfront 50/50 · any origin placement", tone: "orange",
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
        "Results start September 20, 2026 at 16:00 GMT+2; earlier cohorts and proceeds are excluded.",
        "Background 50/50 applies to new assignments in the next release. Earlier builds use 70/30; saved assignments are unchanged.",
        "The recovery group is assigned before onboarding. All subsequent proceeds count in that group, including immediate regular-paywall purchases. The offer appears after purchase cancellation, at most once; the home-screen shortcut remains available to both groups.",
      ],
    };
  }

  return null;
}

export function activeABTestCount(appId: string) {
  return appExperimentMap(appId)?.tests.filter((experiment) => experiment.branches.length > 1).length ?? 0;
}
