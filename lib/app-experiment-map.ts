import { VERSY_FIXED_YEARLY_PRICE, VERSY_HARD_PAYWALL_EXPERIMENT } from "./versy-paywall-policy";
import { GLOW_ONBOARDING_ID, GLOW_PAYWALL_FLOW_ID, GLOW_PAYWALL_FLOWS } from "./glow-onboarding-experience";
import { GLOW_YEARLY_PRICE_EXPERIMENT, GLOW_YEARLY_PRICES } from "./native-paywall-allocation";
import { POKY_NOTE_EXPERIMENT } from "./poky-paywall-note";
import { POKY_OFFER_VARIANTS } from "./poky-onboarding-offer";

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
      id: "poky-plan-design-v2-combinations", label: "Plan A / B v2", scope: "Next app build · new assignments · Plan B v2 skips loading", tone: "blue",
      branches: [
        { id: "plan_a", label: "Plan A", percent: 20 },
        { id: "plan_b_v2", label: "Plan B v2", percent: 80 },
      ],
    };
    return {
      tests: [
        plan,
        planDesign,
        {
          id: "poky-trial-vs-current", label: "Onboarding offer", scope: "New installs · HP 50% / trials 50% · each trial gets ⅓ of trial users", tone: "orange",
          branches: POKY_OFFER_VARIANTS.map(({ key, label, percent }) => ({
            id: key, label: key === "current" ? "Current paywall flow" : key === "trial" ? "3-day trial · native" : label, percent,
          })),
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
        {
          id: POKY_NOTE_EXPERIMENT, label: "Team note", scope: "Next app build · independent of the base offer", tone: "orange", planned: true,
          branches: [{ id: "control", label: "Original flow", percent: 20 }, { id: "note", label: "With team note", percent: 80 }],
        },
      ],
      combinations: plan.branches.flatMap((intro) => planDesign.branches.map((design) => ({
        id: `${intro.id}-${design.id}`,
        label: `${intro.label} + ${design.label}`,
        percent: intro.percent * design.percent / 100,
      }))),
      notes: [
        "Results start September 20, 2026 at 16:00 GMT+2. Everyone now uses the Warm experience.",
        "The next app build assigns 80% a team note before the existing paywall sequence, and 20% the original sequence. This independent, saved assignment applies to HP, 3-day, 7-day current and 7-day mascot flows, including both plan-intro journeys. The new note comparison includes pre-paywall dropouts and keeps historical offer assignments separate.",
        "The v4 onboarding offer assigns HP 50% and trials 50%, divided equally between three-day, seven-day current and seven-day mascot (exactly 1/6 of all new assignments each). Both seven-day presentations share the same product and price. Trial arms skip High/Name and recovery. Saved v1, v2 and v3 assignments keep their original allocation and join matching flow rows; the mascot remains separate. The US-only HP override remains through October 28.",
        "The next app build assigns Plan B v2 80% and Plan A 20%, independently of the 50/50 intro: 40% B v2 and 10% A per intro route. Plan B v2 skips loading and temporarily reuses the current Plan B UI. Saved Plan B users move to v2; saved A stays A. Migrated users are excluded from the fresh v2 comparison. The original four journey rows and v1 results remain available.",
        "The updated app uses native paywalls for everyone, including former Superwall cohorts. The Superwall/native comparison is retired; historical assignments remain stored.",
        "Every non-trial user is eligible for native recovery after cancelling a main purchase, once per install. Former holdouts are included; trial paywalls skip automatic recovery. The home-screen shortcut is separate.",
      ],
    };
  }

  if (appId === "versy") {
    const yearlyPrices = [{ id: VERSY_FIXED_YEARLY_PRICE.productID, label: VERSY_FIXED_YEARLY_PRICE.label }];
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
          id: VERSY_HARD_PAYWALL_EXPERIMENT, label: "Yearly-only paywall", scope: "Next app build · both Widget flows · 100% hard", tone: "orange",
          branches: [
            { id: "hard", label: "Yearly · Hard", percent: 100 },
          ],
        },
        {
          id: VERSY_FIXED_YEARLY_PRICE.experiment, label: "Yearly price", scope: "Next app build · fixed $49.99 · 100% rollout", tone: "orange",
          branches: yearlyPrices.map(({ id, label }) => ({ id, label, percent: 100 })),
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
      combinations: yearlyPrices.map(({ id, label }) => ({
        id: `yearly_only|hard|${id}`,
        label: `Yearly only · Hard · ${label}`,
        percent: 100,
      })),
      notes: [
        "Current app code assigns new users equally to Bible Widget, Shorter and Bible Scroll, including Mexico. The next build makes both Widget paywalls 100% hard, including former dismissible assignments. Historical onboarding comparisons keep their original geographic eligibility.",
        "Both note variants keep the existing reviews. The next app build adds the team note after reviews for 80%, while 20% continue directly to their existing paywall flow. The sticky assignment is independent of onboarding route, access and yearly price. No App Store review prompts during onboarding. Only explicitly enrolled production users enter this comparison, including review and note dropouts. Scroll benefits are now standard; the old benefits comparison remains historical.",
        "Bible Scroll uses a dismissible trial timeline with yearly and weekly plans. The saved soft/hard assignment does not control this onboarding screen; access comparisons include widget variants only.",
        "The next build uses the fixed US $49.99 yearly SKU for everyone, including upgrades. StoreKit supplies localized prices and trial eligibility. Price and access A/B tests are retired; older client records remain in historical comparisons and fixed assignments never enter them. Bible Scroll keeps its weekly option and dismissible timeline. Daily Gift keeps its separate discounted product.",
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
