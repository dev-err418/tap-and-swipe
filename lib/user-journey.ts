export type UserJourneyStep = {
  attribute: string;
  label: string;
  /** A side path. Its count is not the baseline for the next screen. */
  branch?: boolean;
  /** The funnel ends here. Completion rate is this step's share of assigned installs. */
  paywall?: boolean;
  /** Match `gp1_p_*` keys that end with this suffix. */
  attributeSuffix?: string;
  /** Match this exact attribute when its value is one of `attributeValues`. */
  attributeKey?: string;
  attributeValues?: string[];
};

export type UserJourneyVariant = {
  key: string;
  label: string;
  steps: UserJourneyStep[];
};

export type UserJourneyDefinition = {
  title: string;
  variantAttribute: string;
  /** Old install versions could not record the screens in this journey. */
  minimumInstallVersion?: string;
  /** Require explicit tracking enrollment and build environment when available. */
  cohortAttributes?: Record<string, string>;
  note?: string;
  variants: UserJourneyVariant[];
};

export type UserJourneyStepResult = UserJourneyStep & {
  users: number;
  /** Users who reached this screen divided by assigned installs. */
  share: number;
};

export type UserJourneyVariantResult = {
  key: string;
  label: string;
  assigned: number;
  /** Paywall seen divided by assigned installs. */
  completionShare: number;
  recorded: boolean;
  steps: UserJourneyStepResult[];
};

export type UserJourneyDrop = {
  attribute: string;
  lost: number;
  lostShare: number;
  branch: boolean;
};

export type UserJourneyReport = {
  status: "ready" | "empty" | "unavailable" | "unsupported";
  title: string;
  variants: UserJourneyVariantResult[];
  note?: string;
};

const ASSIGNED_KEY = "__assigned__";

/** Glow IAM and Copy walk the same screens. Order is IAMStep.activeSequence. */
const GLOW_STEPS: UserJourneyStep[] = [
  ["welcome", "Welcome"],
  ["glow_intro", "Glow intro"],
  ["glow_setup", "Glow setup"],
  ["first_name", "Name"],
  ["age", "Age"],
  ["gender", "Gender"],
  ["relationship", "Relationship"],
  ["employment", "Employment"],
  ["religion", "Religion"],
  ["zodiac", "Zodiac"],
  ["definition", "Definition"],
  ["affirmation_familiarity", "Familiarity"],
  ["habit_helpers", "Habit helpers"],
  ["repetition_intro", "Repetition"],
  ["notifications", "Notifications"],
  ["needs", "Needs"],
  ["current_mood", "Mood"],
  ["mood_causes", "Mood causes"],
  ["confidence", "Confidence"],
  ["mental_health", "Mental health"],
  ["barriers", "Barriers"],
  ["small_steps", "Small steps"],
  ["minutes", "Minutes"],
  ["streak_goal", "Streak goal"],
  ["streak_intro", "Streak intro"],
  ["future_outlook", "Outlook"],
  ["manifestation", "Manifestation"],
  ["thoughts", "Thoughts"],
  ["brain_rewiring", "Brain"],
  ["benefits", "Benefits"],
  ["change", "Change"],
  ["topics", "Topics"],
  ["practice", "Practice"],
  ["app_icon", "App icon"],
  ["theme_background", "Theme"],
  ["areas_to_improve", "Improve"],
  ["letting_go", "Letting go"],
  ["confront", "Confront"],
  ["goals", "Goals"],
  ["glow_goals", "Glow goals"],
  ["widget", "Widget"],
  ["resilience", "Resilience"],
  ["trial_access", "Trial access"],
  ["trial_reminder", "Trial reminder"],
].map(([name, label]) => ({ attribute: `${name}_screen_seen`, label }));

function glowVariant(key: string, label: string, placement: string): UserJourneyVariant {
  return {
    key,
    label,
    steps: [...GLOW_STEPS, {
      attribute: "paywall_seen",
      label: "Paywall",
      paywall: true,
      attributeSuffix: `__${placement}`,
    }],
  };
}

/** Bible widget order is WidgetStep declaration order. Attributes are bible_widget_<case>_screen_seen. */
const VERSY_WIDGET_STEPS: UserJourneyStep[] = [
  ["entry", "Entry"],
  ["age", "Age"],
  ["name", "Name"],
  ["gender", "Gender"],
  ["relationship", "Relationship"],
  ["faithTransition", "Faith intro"],
  ["familiarity", "Familiarity"],
  ["practice", "Practice"],
  ["closeness", "Closeness"],
  ["denomination", "Denomination"],
  ["preferencesTransition", "Preferences"],
  ["checkIn", "Check-in"],
  ["streakGoal", "Streak goal"],
  ["streakIntro", "Streak intro"],
  ["habit", "Habit"],
  ["notifications", "Notifications"],
  ["notificationsDenied", "Notifications denied", true],
  ["icon", "App icon"],
  ["theme", "Theme"],
  ["pathMessage", "Path"],
  ["journeyTransition", "Journey"],
  ["relationshipWithGod", "Relationship with God"],
  ["widget", "Widget"],
  ["feeling", "Feeling"],
  ["feelingReason", "Feeling reasons"],
  ["struggles", "Struggles"],
  ["gratitude", "Gratitude"],
  ["futureTransition", "Future"],
  ["futureGoal", "Future goal"],
  ["improve", "Improve"],
  ["versePrayerTransition", "Verse"],
  ["reviews", "Reviews"],
  ["premiumIntro", "Premium"],
  ["trialReminder", "Trial reminder"],
  ["paywall", "Paywall"],
].map(([name, label, branch]) => ({
  attribute: `bible_widget_${name}_screen_seen`,
  label: String(label),
  ...(name === "paywall" ? { paywall: true } : {}),
  ...(branch ? { branch: true } : {}),
}));

/** Poky's activeSequence; the animated intro is inserted just before the plan. */
const POKY_STEPS: UserJourneyStep[] = [
  ["welcome", "Welcome"],
  ["poky_intro", "Poky intro"],
  ["poky_setup", "Poky setup"],
  ["taking_medication", "Medication intro"],
  ["medication", "Medication"],
  ["dose", "Dose"],
  ["shot_frequency", "Frequency"],
  ["right_place", "Right place"],
  ["gender", "Gender"],
  ["doctor_recommended", "Doctor"],
  ["height", "Height"],
  ["current_weight", "Weight"],
  ["goal_weight", "Goal weight"],
  ["first_name", "Name"],
  ["weight_left", "Weight result"],
  ["pace", "Pace"],
  ["app_impact", "App impact"],
  ["daily_routine", "Routine"],
  ["brand_education", "Education"],
  ["side_effect", "Side effects"],
  ["motivation", "Motivation"],
  ["review_support", "Reviews"],
  ["customizing_plan", "Creating plan"],
].map(([name, label]) => ({ attribute: `${name}_screen_seen`, label }));

function pokyVariant(key: string, label: string, animated: boolean, plan: string): UserJourneyVariant {
  return {
    key,
    label,
    steps: [
      ...POKY_STEPS,
      ...(animated ? [{ attribute: "animated_plan_intro_screen_seen", label: "Plan intro" }] : []),
      { attribute: "custom_plan_screen_seen", label: plan },
      { attribute: "onboarding_paywall_screen_seen", label: "Paywall", paywall: true },
    ],
  };
}

export function userJourneyDefinition(appId: "glow" | "poky" | "versy"): UserJourneyDefinition | null {
  if (appId === "glow") {
    return {
      title: "User journey",
      variantAttribute: "onboarding_variant",
      variants: [
        glowVariant("iam", "IAM", "onboarding_iam_complete"),
        glowVariant("copy", "Copy", "onboarding_complete_copy"),
      ],
    };
  }
  if (appId === "versy") {
    return {
      title: "User journey",
      variantAttribute: "onboarding_variant",
      minimumInstallVersion: "1.2.0",
      cohortAttributes: { onboarding_experiment_id: "bible_widget_shorter_v1" },
      variants: [
        { key: "bible_widget", label: "Bible widget", steps: VERSY_WIDGET_STEPS },
        { key: "bible_widget_shorter", label: "Bible widget shorter", steps: VERSY_WIDGET_STEPS.filter(
          (step) => !["bible_widget_relationshipWithGod_screen_seen", "bible_widget_habit_screen_seen"].includes(step.attribute),
        ) },
      ],
    };
  }
  if (appId === "poky") {
    return {
      title: "User journey",
      variantAttribute: "onboarding_variant",
      cohortAttributes: {
        poky_onboarding_journey_schema: "1",
        poky_tracking_environment: "production",
      },
      note: "Includes installs that began the tracked onboarding flow in the updated Poky app. Earlier journeys cannot be reconstructed. Paywall seen includes the native, trial and Superwall onboarding paywalls.",
      variants: [
        pokyVariant("control_plan_a", "No intro · Plan A", false, "Plan A"),
        pokyVariant("control_plan_b", "No intro · Plan B", false, "Plan B"),
        pokyVariant("animated_plan_a", "Animated intro · Plan A", true, "Plan A"),
        pokyVariant("animated_plan_b", "Animated intro · Plan B", true, "Plan B"),
      ],
    };
  }
  return null;
}

export function unsupportedUserJourney(appId: "glow" | "poky" | "versy"): UserJourneyReport {
  return {
    status: "unsupported",
    title: "User journey",
    variants: [],
    note: `${appId === "poky" ? "Poky" : "This app"} has no screen-by-screen Superwall journey.`,
  };
}

export function buildUserJourney(
  definition: UserJourneyDefinition,
  rows: { variant: string; key: string; users: number }[],
): UserJourneyReport {
  const assigned = new Map<string, number>();
  const seen = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row.key === ASSIGNED_KEY) {
      assigned.set(row.variant, row.users);
      continue;
    }
    const counts = seen.get(row.variant) ?? new Map<string, number>();
    counts.set(row.key, row.users);
    seen.set(row.variant, counts);
  }

  const variants = definition.variants.flatMap((variant) => {
    const cohort = assigned.get(variant.key) ?? 0;
    if (cohort <= 0) return [];
    const counts = seen.get(variant.key) ?? new Map<string, number>();
    const steps = variant.steps.map((step) => {
      const users = counts.get(step.attribute) ?? 0;
      return { ...step, users, share: users / cohort };
    });
    const paywall = [...steps].reverse().find((step) => step.paywall);
    return [{
      key: variant.key,
      label: variant.label,
      assigned: cohort,
      completionShare: paywall?.share ?? 0,
      recorded: steps.some((step) => step.users > 0),
      steps,
    }];
  });

  if (variants.length === 0) {
    return { status: "empty", title: definition.title, variants: [], note: `No assigned installs in this window.${definition.note ? ` ${definition.note}` : ""}` };
  }
  return {
    status: "ready",
    title: definition.title,
    variants,
    ...(definition.note
      ? { note: definition.note }
      : definition.minimumInstallVersion
      ? { note: `Includes installs on version ${definition.minimumInstallVersion} or later, when screen progress tracking became available.` }
      : {}),
  };
}

/** Lost users versus the previous main-path screen. Branches do not move that baseline. */
export function journeyDrops(steps: UserJourneyStepResult[], assigned: number): UserJourneyDrop[] {
  let baseline = assigned;
  return steps.map((step) => {
    const lost = Math.max(0, baseline - step.users);
    const drop = {
      attribute: step.attribute,
      lost,
      lostShare: baseline > 0 ? lost / baseline : 0,
      branch: Boolean(step.branch),
    };
    if (!step.branch) baseline = step.users;
    return drop;
  });
}

export function largestDropAttributes(drops: UserJourneyDrop[], count = 3) {
  return drops
    .filter((drop) => !drop.branch && drop.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, count)
    .map((drop) => drop.attribute);
}

export { ASSIGNED_KEY };
