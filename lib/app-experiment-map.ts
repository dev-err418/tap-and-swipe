import { VERSY_SCROLL_ACCESS_EXPERIMENT } from "./versy-scroll-paywall-access";
import { VERSY_FIXED_YEARLY_PRICE } from "./versy-paywall-policy";
import { GLOW_ONBOARDING_ID } from "./glow-onboarding-experience";
import { GLOW_FRANCE_YEARLY_PRICES, GLOW_YEARLY_PRICE_EXPERIMENT } from "./native-paywall-allocation";
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
          id: GLOW_ONBOARDING_ID, label: "IAM onboarding", scope: "IAM for new installations", tone: "blue",
          branches: [
            { id: "iam", label: "IAM", percent: 100 },
          ],
        },
        {
          id: GLOW_YEARLY_PRICE_EXPERIMENT.id, label: "Yearly price", scope: "France storefront · equal thirds · 7-day trials", tone: "orange",
          branches: GLOW_FRANCE_YEARLY_PRICES.map(({ id, price }) => ({
            id, label: price, percent: 100 / GLOW_FRANCE_YEARLY_PRICES.length,
          })),
        },
      ],
      notes: [
        "Results start September 20, 2026 at 08:00 GMT+2; earlier cohorts and proceeds are excluded.",
        "New installs use IAM. The onboarding paywall sequence is trial introduction, trial reminder, then the yearly paywall.",
        "The three yearly variants each offer a 7-day trial to eligible customers. Prices shown are for the French App Store storefront.",
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
        "The v4 onboarding offer assigns HP 50% and trials 50%, divided equally between three-day, seven-day current and seven-day mascot (exactly 1/6 of all new assignments each). Both seven-day presentations share the same product and price. Trial arms skip High/Name and recovery. Saved v1, v2 and v3 assignments keep their original allocation and join matching flow rows; the mascot remains separate. The US-only HP override remains through October 29, with normal saved offer routing resuming October 30 at device-local midnight.",
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
          id: "versy-scroll-the-bible-v3", label: "Onboarding", scope: "Next app build · three equal Scroll variants", tone: "blue",
          branches: [
            { id: "scroll_the_bible", label: "Bible Scroll · Current", percent: 100 / 3 },
            { id: "scroll_the_bible_animations", label: "Bible Scroll · Animations", percent: 100 / 3 },
            { id: "scroll_the_bible_videos", label: "Bible Scroll · Videos", percent: 100 / 3 },
          ],
        },
        {
          id: VERSY_SCROLL_ACCESS_EXPERIMENT, label: "Scroll paywall access", scope: "Next app build · independent 50/50 within every Scroll variant", tone: "orange",
          branches: [
            { id: "hard", label: "Hard", percent: 50 },
            { id: "dismissible", label: "Current soft", percent: 50 },
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
            { id: "control", label: "Reviews → paywall", percent: 50 },
            { id: "note", label: "Reviews → note → paywall", percent: 50 },
          ],
        },
      ],
      combinations: ["scroll_the_bible", "scroll_the_bible_animations", "scroll_the_bible_videos"].flatMap((flow) =>
        ["hard", "dismissible"].map((access) => ({ id: `${flow}|${access}`, label: `${flow} · ${access}`, percent: 100 / 6 }))),
      notes: [
        "New assignments use scroll_the_bible_v3: Current, Animations and Videos receive equal thirds in every country. Ad names no longer select Widget. Saved routes and experiment IDs remain unchanged.",
        "At Welcome, a separate sticky 50/50 draw selects hard or current soft access within each Scroll variant. Both use the same Scroll timeline, yearly and weekly plans, prices and trial terms. Hard removes the close action; checkout cancellation opens recovery with no close action or swipe dismissal, requiring purchase or restore. Soft retains dismissible recovery. Existing Scroll users remain soft.",
        "The team note remains an independent 50/50 assignment, with reviews in both arms. Saved historical assignments remain separate.",
        "The Scroll access comparison uses explicit production Welcome records and reports proceeds per mature install, including non-payers. Ongoing trial windows are excluded from both proceeds and denominator; actual trial expiry can extend the wait. Country and Meta breakdowns use the same saved cohort.",
        "The fixed US $49.99 yearly SKU, localized StoreKit terms, weekly option and Daily Gift product are unchanged. Historical Widget and v2 onboarding reports remain separate from the new access test. App release and dashboard deployment are required before results arrive.",
      ],
    };
  }

  return null;
}

export function activeABTestCount(appId: string) {
  return appExperimentMap(appId)?.tests.filter((experiment) => !experiment.planned && experiment.branches.length > 1).length ?? 0;
}
