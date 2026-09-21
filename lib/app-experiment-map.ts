import { nativePaywallAllocation } from "./native-paywall-allocation";

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
          id: "native_paywalls_v2", label: "Native paywalls", scope: "English / fallback · Spanish · German", tone: "orange",
          branches: ["yr_49", "yr_59", "yr_wk_59"].map((variant) => ({
            id: variant,
            label: variant,
            percent: nativePaywallAllocation("native_paywalls_v2", variant, variant)!,
          })),
        },
        {
          id: "journal_vs_practice_v1", label: "Journal VS Practice", scope: "Home button · prepared, production enrollment off", tone: "blue",
          branches: [
            { id: "journal", label: "Journal", percent: 50 },
            { id: "practice", label: "Practice", percent: 50 },
          ],
        },
      ],
      notes: ["App-code allocations for new assignments; existing users keep their variants. This does not confirm App Store rollout."],
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
          id: "poky-native-recovery-holdout", label: "Recovery", scope: "Hardcoded paywalls · all 4 languages · any origin placement", tone: "orange",
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
        "Background 50/50 applies to new assignments in the next release. Earlier builds use 70/30; saved assignments are unchanged.",
        "Recovery follows purchase cancellation or main-paywall dismissal, at most once. The home-screen shortcut is a separate 100% offer, not part of the recovery test.",
      ],
    };
  }

  return null;
}

export function activeABTestCount(appId: string) {
  return appExperimentMap(appId)?.tests.filter((experiment) => experiment.branches.length > 1).length ?? 0;
}
