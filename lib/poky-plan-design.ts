// Separate v2 attributes keep the original four onboarding cohorts readable.
export const POKY_PLAN_DESIGN_V2_ID = "poky-plan-design-v2-combinations";
export const POKY_PLAN_DESIGN_V2_EXPERIMENT = "onboarding_plan_design_v2";
export const POKY_PLAN_DESIGN_V2_ATTRIBUTE_KEYS = [
  "onboarding_plan_design_v2_experiment",
  "onboarding_plan_design_v2_variant",
  "onboarding_plan_design_v2_allocation",
] as const;

export const POKY_PLAN_DESIGN_V2_VARIANTS = [
  { key: "animated_plan_a", label: "Animated plan intro + Plan A", intro: "animated_plan", design: "plan_a" },
  { key: "animated_plan_b_v2", label: "Animated plan intro + Plan B v2", intro: "animated_plan", design: "plan_b_v2" },
  { key: "no_intro_plan_a", label: "No intro + Plan A", intro: "control", design: "plan_a" },
  { key: "no_intro_plan_b_v2", label: "No intro + Plan B v2", intro: "control", design: "plan_b_v2" },
].map(({ key, label, intro, design }) => ({
  key, label,
  attributes: {
    onboarding_plan_variant: intro,
    onboarding_plan_allocation: "50_50",
    onboarding_plan_design_v2_experiment: POKY_PLAN_DESIGN_V2_EXPERIMENT,
    onboarding_plan_design_v2_variant: design,
    onboarding_plan_design_v2_allocation: "20_80",
  },
}));
