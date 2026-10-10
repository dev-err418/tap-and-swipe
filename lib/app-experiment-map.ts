import { GLOW_ONBOARDING_ID } from "./glow-onboarding-experience";
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
 * Poky's independent onboarding intro, plan screen, and paywall routing.
 * Update this alongside app/campaign allocation changes.
 * Historical result cards are deliberately not the source of active tests.
 */
export function appExperimentMap(appId: string): AppExperimentMapDefinition | null {
  if (appId === "glow") {
    return {
      tests: [
        {
          id: GLOW_ONBOARDING_ID, label: "Onboarding experience", scope: "Prepared · enrollment off · new eligible installations", tone: "blue", planned: true,
          branches: [
            { id: "current", label: "Current", percent: 15 },
            { id: "mascot_free", label: "No mascot", percent: 85 },
          ],
        },
        {
          id: "glow-onboarding-copy", label: "Onboarding", scope: "New onboarding assignments", tone: "blue",
          branches: [
            { id: "iam", label: "IAM", percent: 50 },
            { id: "copy", label: "Copy", percent: 50 },
          ],
        },
        {
          id: GLOW_PAYWALL_EXPERIMENT.id, label: "Native paywalls", scope: "Glow 1.7.2 · English / fallback · Spanish · German", tone: "orange",
          branches: GLOW_PAYWALL_EXPERIMENT.variants.map(({ id, percent }) => ({
            id,
            label: id,
            percent,
          })),
        },
      ],
      notes: [
        "Results start September 20, 2026 at 08:00 GMT+2; earlier cohorts and proceeds are excluded.",
        "Practice is the only Home experience in the next Glow release. The Journal comparison has ended.",
        "V3 starts a new sticky paywall assignment on upgrade; v1/v2 results and pending purchases stay separate. Onboarding assignments are unchanged.",
        "Glow 1.7.3 extends English yearly-only yr_59 presentations through September 28 under the separate legacy experiment; saved v3 assignments resume September 29 (device local time).",
        "The split shows app configuration, not observed traffic. StoreKit determines which subscriptions are available and their displayed prices.",
      ],
    };
  }

  if (appId === "poky") {
    const plan: ExperimentMapTest = {
      id: "poky-animated-plan", label: "Plan intro", scope: "New onboarding assignments", tone: "blue",
      branches: [
        { id: "control", label: "No intro", percent: 50 },
        { id: "animated_plan", label: "Animated plan intro", percent: 50 },
      ],
    };
    const planDesign: ExperimentMapTest = {
      id: "poky-plan-design-combinations", label: "Plan A/B", scope: "New onboarding assignments · four intro × plan cohorts", tone: "blue",
      branches: [
        { id: "plan_a", label: "Plan A", percent: 50 },
        { id: "plan_b", label: "Plan B · placeholder", percent: 50 },
      ],
    };
    return {
      tests: [
        plan,
        planDesign,
        {
          id: "poky-trial-vs-current", label: "Onboarding offer", scope: "New installs · saved 50/50 assignment", tone: "orange",
          branches: [
            { id: "current", label: "Current paywall flow", percent: 50 },
            { id: "trial", label: "3-day trial · native", percent: 50 },
          ],
        },
        {
          id: "poky-english-paywalls", label: "Native main paywalls", scope: "Current arm · 🇬🇧 English / fallback", tone: "orange",
          branches: [
            { id: "624224", label: "Onboarding · High - 1", percent: 50 },
            { id: "624761", label: "Onboarding Name - 2", percent: 50 },
          ],
        },
        {
          id: "poky-localized-paywalls", label: "Native localized paywalls", scope: "Current arm · 🇪🇸 Spanish · 🇩🇪 German · 🇫🇷 French", tone: "orange",
          branches: [{ id: "name-2", label: "Name - 2 · each language", percent: 100 }],
        },
        {
          id: "poky-native-recovery", label: "Native recovery", scope: "All non-trial users · once per install · any origin placement", tone: "orange",
          branches: [
            { id: "recovery", label: "Recovery paywall", percent: 100 },
          ],
        },
      ],
      combinations: plan.branches.flatMap((intro) => planDesign.branches.map((design) => ({
        id: `${intro.id}-${design.id}`,
        label: `${intro.label} + ${design.label}`,
        percent: intro.percent * design.percent / 100,
      }))),
      notes: [
        "Results start September 20, 2026 at 16:00 GMT+2. Everyone now uses the Warm experience.",
        "The 50/50 onboarding offer assigns the current native paywall flow or a single hardcoded three-day trial paywall. The trial arm skips the High/Name and recovery tests.",
        "The plan design draw is a new independent 50/50 assignment. Combined with the existing intro draw, it creates four 25% cohorts. Plan B currently displays a placeholder screen.",
        "The updated app uses native paywalls for everyone, including former Superwall cohorts. The Superwall/native comparison is retired; historical assignments remain stored.",
        "Every non-trial user is eligible for native recovery after cancelling a main purchase, once per install. Former holdouts are included; trial paywalls skip automatic recovery. The home-screen shortcut is separate.",
      ],
    };
  }

  if (appId === "versy") {
    const yearlyPrices = [
      { id: "com.arthurbuildsstuff.bible.yearly_3999_80", label: "$39.99 Yearly" },
      { id: "com.arthurbuildsstuff.bible.yearly_4999_80", label: "$29.99 Yearly" },
    ];
    return {
      tests: [
        {
          id: "versy-scroll-the-bible-v1", label: "Onboarding", scope: "New assignments outside Mexico · 10/10/80", tone: "blue",
          branches: [
            { id: "bible_widget", label: "Bible widget", percent: 10 },
            { id: "bible_widget_shorter", label: "Bible widget shorter", percent: 10 },
            { id: "scroll_the_bible", label: "Bible Scroll", percent: 80 },
          ],
        },
        {
          id: "versy-yearly-paywall-access-v1", label: "Yearly-only paywall", scope: "Widget onboarding · independent 50/50 assignment", tone: "orange",
          branches: [
            { id: "dismissible", label: "Yearly · Soft", percent: 50 },
            { id: "hard", label: "Yearly · Hard", percent: 50 },
          ],
        },
        {
          id: "versy-yearly-price-v2", label: "Yearly price", scope: "Fresh assignments · $29.99 / $39.99 · 50/50", tone: "orange",
          branches: yearlyPrices.map(({ id, label }) => ({ id, label, percent: 50 })),
        },
      ],
      combinations: ["dismissible", "hard"].flatMap((access) => yearlyPrices.map(({ id, label }) => ({
        id: `yearly_only|${access}|${id}`,
        label: `Yearly only · ${access === "hard" ? "Hard" : "Soft"} · ${label}`,
        percent: 25,
      }))),
      notes: [
        "New assignments use 10% Bible Widget, 10% Shorter and 80% Bible Scroll. Mexico receives Bible Scroll automatically and is excluded from the comparison, along with uncertain countries.",
        "Bible Scroll uses a dismissible trial timeline with yearly and weekly plans, without onboarding recovery. The saved soft/hard assignment does not control this onboarding screen; access comparisons include widget variants only.",
        "Yearly price v2 assigns new users equally to actual US $29.99 or $39.99 yearly offers. The former $17.99 SKU is retired from presentation. Migrated users are excluded from the fresh price comparison. Yearly price remains a saved independent assignment. Bible Scroll also offers the fixed weekly product. Other upgrade placements use the assigned yearly product and access mode, except the daily gift.",
        "Daily gift: after 24 hours, eligible non-premium users see a sealed envelope then a discounted yearly offer on their first app open each local day. This 100% rollout uses YearlyDiscount, independently of yearly price assignment, and is reported in Paywalls as versy_daily_gift_v1 / daily_gift_app_open; historical app_open remains separate.",
        "Existing widget assignments remain in bible_widget_shorter_v1 and are reported in a separate historical comparison. Current funnels use scroll_the_bible_v1 only. Country grouping uses reported and install geography, not immutable assignment geography.",
      ],
    };
  }

  return null;
}

export function activeABTestCount(appId: string) {
  return appExperimentMap(appId)?.tests.filter((experiment) => !experiment.planned && experiment.branches.length > 1).length ?? 0;
}
