import { GLOW_ONBOARDING_ID, GLOW_PAYWALL_FLOW_ID } from "./glow-onboarding-experience";
import { GLOW_YEARLY_PRICE_EXPERIMENT, GLOW_YEARLY_PRICES } from "./native-paywall-allocation";

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
 * Verified 2026-10-11 against Glow's OnboardingExperiment/GlowProductID,
 * Poky's independent onboarding intro, plan screen, and paywall routing.
 * Update this alongside app/campaign allocation changes.
 * Historical result cards are deliberately not the source of active tests.
 */
export function appExperimentMap(appId: string): AppExperimentMapDefinition | null {
  if (appId === "glow") {
    return {
      tests: [
        {
          id: GLOW_ONBOARDING_ID, label: "IAM vs manifest-audio", scope: "Next app build · new eligible installations", tone: "blue", planned: true,
          branches: [
            { id: "iam", label: "IAM", percent: 50 },
            { id: "manifest-audio", label: "manifest-audio", percent: 50 },
          ],
        },
        {
          id: GLOW_PAYWALL_FLOW_ID, label: "Paywall flow", scope: "Next app build · both onboarding journeys", tone: "orange", planned: true,
          branches: [
            { id: "standard", label: "Current flow", percent: 50 },
            { id: "versy_reminder", label: "Versy reminder flow", percent: 50 },
          ],
        },
        {
          id: GLOW_YEARLY_PRICE_EXPERIMENT.id, label: "Yearly price", scope: "Next app build · three yearly prices · all languages", tone: "orange", planned: true,
          branches: GLOW_YEARLY_PRICE_EXPERIMENT.variants.map(({ id, percent }) => ({
            id,
            label: GLOW_YEARLY_PRICES.find((price) => price.id === id)!.price,
            percent,
          })),
        },
      ],
      notes: [
        "Results start September 20, 2026 at 08:00 GMT+2; earlier cohorts and proceeds are excluded.",
        "Practice is the only Home experience in the next Glow release. The Journal comparison has ended.",
        "IAM wording is retired in the next app build. Both onboarding arms use Copy wording under a new experiment ID; historical comparisons stay separate.",
        "The new price test saves a v4 assignment. Earlier five-variant v3 and temporary US yearly-only presentations remain separate in Paywalls, along with their purchase attribution.",
        "The Versy reminder flow also offers a fixed Weekly plan in View all plans, with the assigned annual plan selected by default. Weekly is not randomized; its purchases remain attributed to the saved flow and yearly-price assignments.",
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
      { id: "com.arthurbuildsstuff.bible.yearly_4999", label: "$49.99 Yearly" },
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
          id: "versy-yearly-price-v3", label: "Yearly price", scope: "Fresh assignments · $39.99 / $49.99 · 50/50", tone: "orange",
          branches: yearlyPrices.map(({ id, label }) => ({ id, label, percent: 50 })),
        },
        {
          id: "versy-scroll-benefits-v1", label: "Benefits screen", tone: "orange", planned: true,
          scope: "Next app build · Bible Scroll only · 50/50 after Premium preview",
          branches: [
            { id: "control", label: "Current flow", percent: 50 },
            { id: "benefits", label: "Added benefits screen", percent: 50 },
          ],
        },
      ],
      combinations: ["dismissible", "hard"].flatMap((access) => yearlyPrices.map(({ id, label }) => ({
        id: `yearly_only|${access}|${id}`,
        label: `Yearly only · ${access === "hard" ? "Hard" : "Soft"} · ${label}`,
        percent: 25,
      }))),
      notes: [
        "New assignments use 10% Bible Widget, 10% Shorter and 80% Bible Scroll. Mexico receives Bible Scroll automatically and is excluded from the comparison, along with uncertain countries.",
        "The next app build assigns new Bible Scroll Welcome users 50/50 to the current flow or an extra benefits screen after Premium preview, before Trial reminder. This assignment is independent of yearly price. Legacy/resumed flows and development data are excluded; the optional screen never becomes a required journey drop-off baseline.",
        "Bible Scroll uses a dismissible trial timeline with yearly and weekly plans, without onboarding recovery. The saved soft/hard assignment does not control this onboarding screen; access comparisons include widget variants only.",
        "The next app update uses yearly price v3: new users receive US $39.99 or $49.99 yearly offers equally, both with a 7-day trial. Earlier price tests remain historical. The $49.99 product has no recovery promotion and skips onboarding recovery. Migrated users are excluded from the fresh price comparison. Yearly price remains a saved independent assignment. Bible Scroll also offers the fixed weekly product. Other upgrade placements use the assigned yearly product and access mode, except the daily gift.",
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
