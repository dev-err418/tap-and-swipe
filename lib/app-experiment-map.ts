import { VERSY_YEARLY_PRICES } from "./versy-yearly-price-cohorts";
import { GLOW_ONBOARDING_ID, GLOW_PAYWALL_FLOW_ID, GLOW_PAYWALL_FLOWS } from "./glow-onboarding-experience";
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
          branches: GLOW_PAYWALL_FLOWS.map((flow) => ({ ...flow })),
        },
        {
          id: GLOW_YEARLY_PRICE_EXPERIMENT.id, label: "Yearly price", scope: "Next app build · three prices × 3-day / 7-day trials · all languages", tone: "orange", planned: true,
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
        "New users receive a saved v5 price/trial assignment, with equal chances of 3 and 7 days. Existing v4 assignments keep their 7-day offer and results in the matching rows. Older five-variant and temporary US presentations remain separate.",
        "The Versy reminder flow also offers a fixed Weekly plan in View all plans, with the assigned annual plan selected by default. Weekly is not randomized; its purchases remain attributed to the saved flow and yearly-price assignments.",
        "80% see testimonials followed by a team note before the paywall sequence; 20% keep the original sequence. The two base flows remain equally likely. Saved v1 assignments stay in their historical 50/50 report.",
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
          id: "poky-trial-vs-current", label: "Onboarding offer", scope: "New installs · saved 25/25/25/25 assignment", tone: "orange",
          branches: [
            { id: "current", label: "Current paywall flow", percent: 25 },
            { id: "trial", label: "3-day trial · native", percent: 25 },
            { id: "trial_7d", label: "7-day trial · current", percent: 25 },
            { id: "trial_7d_mascot", label: "7-day trial · mascot", percent: 25 },
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
        "The v3 onboarding offer assigns HP, three-day trial, seven-day current and seven-day mascot 25% each. Both seven-day presentations share the same product and price. Trial arms skip High/Name and recovery. Matching flows include saved v1 50/50 and v2 25/25/50 results in the same table; the mascot remains separate.",
        "The plan design draw is a new independent 50/50 assignment. Combined with the existing intro draw, it creates four 25% cohorts. Plan B currently displays a placeholder screen.",
        "The updated app uses native paywalls for everyone, including former Superwall cohorts. The Superwall/native comparison is retired; historical assignments remain stored.",
        "Every non-trial user is eligible for native recovery after cancelling a main purchase, once per install. Former holdouts are included; trial paywalls skip automatic recovery. The home-screen shortcut is separate.",
      ],
    };
  }

  if (appId === "versy") {
    const yearlyPrices = VERSY_YEARLY_PRICES.map(({ productID, label }) => ({ id: productID, label }));
    return {
      tests: [
        {
          id: "versy-scroll-the-bible-v1", label: "Onboarding", scope: "New assignments · equal thirds", tone: "blue",
          branches: [
            { id: "bible_widget", label: "Bible widget", percent: 100 / 3 },
            { id: "bible_widget_shorter", label: "Bible widget shorter", percent: 100 / 3 },
            { id: "scroll_the_bible", label: "Bible Scroll", percent: 100 / 3 },
          ],
        },
        {
          id: "versy-yearly-paywall-access-v1", label: "Yearly-only paywall", scope: "Widget onboarding · 50% hard / 50% soft", tone: "orange",
          branches: [
            { id: "dismissible", label: "Yearly · Soft", percent: 50 },
            { id: "hard", label: "Yearly · Hard", percent: 50 },
          ],
        },
        {
          id: "versy-yearly-price-v3", label: "Yearly price", scope: "New assignments · two yearly prices · 7-day trials · 50% each", tone: "orange",
          branches: yearlyPrices.map(({ id, label }) => ({ id, label, percent: 50 })),
        },
        {
          id: "versy_paywall_note_v1", label: "Team note", tone: "orange", planned: true,
          scope: "Next app build · all onboarding routes · reviews in both variants",
          branches: [
            { id: "control", label: "Reviews → paywall", percent: 20 },
            { id: "note", label: "Reviews → note → paywall", percent: 80 },
          ],
        },
      ],
      combinations: ["dismissible", "hard"].flatMap((access) => yearlyPrices.map(({ id, label }) => ({
        id: `yearly_only|${access}|${id}`,
        label: `Yearly only · ${access === "hard" ? "Hard" : "Soft"} · ${label}`,
        percent: 25,
      }))),
      notes: [
        "Current app code assigns new users equally to Bible Widget, Shorter and Bible Scroll, including Mexico. October 26 temporarily routes everyone to Scroll. Widget paywalls assign 50% hard / 50% soft; saved access assignments persist. Historical onboarding comparisons keep their original geographic eligibility.",
        "Both note variants keep the existing reviews. The next app build adds the team note after reviews for 80%, while 20% continue directly to their existing paywall flow. The sticky assignment is independent of onboarding route, access and yearly price. No App Store review prompts during onboarding. Only explicitly enrolled production users enter this comparison, including review and note dropouts. Scroll benefits are now standard; the old benefits comparison remains historical.",
        "Bible Scroll uses a dismissible trial timeline with yearly and weekly plans. The saved soft/hard assignment does not control this onboarding screen; access comparisons include widget variants only.",
        "The yearly price test uses v3: US $39.99 or $49.99, both with 7-day trials for eligible users, at 50/50. The 3-day trial test is retired. Matching seven-day history remains in the price rows; three-day and migrated assignments are excluded. Yearly price is independent of access mode. Bible Scroll also offers the fixed weekly product. Other upgrade placements use the assigned yearly product and access mode, except the daily gift.",
        "Daily Gift recovery also appears after onboarding paywall dismissal; the next build opens recovery after transaction cancellation on hard onboarding paywalls. Day-2 behavior remains: after 24 hours, eligible non-premium users see a sealed envelope then a discounted yearly offer on their first app open each local day. This 100% rollout uses YearlyDiscount, independently of yearly price assignment, and is reported in Paywalls as versy_daily_gift_v1 / daily_gift_app_open; historical app_open remains separate.",
        "Existing widget assignments remain in bible_widget_shorter_v1 and are reported in a separate historical comparison. Current funnels use scroll_the_bible_v1 only. Country grouping uses reported and install geography, not immutable assignment geography.",
      ],
    };
  }

  return null;
}

export function activeABTestCount(appId: string) {
  return appExperimentMap(appId)?.tests.filter((experiment) => !experiment.planned && experiment.branches.length > 1).length ?? 0;
}
