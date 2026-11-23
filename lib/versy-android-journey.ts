import { ASSIGNED_KEY, buildUserJourney, journeyVersion, type UserJourneyDefinition, type UserJourneyReport, type UserJourneyStep } from "./user-journey";
import { androidOnboardingAssignment, VERSY_ANDROID_ROUTES } from "./versy-android-experiments";
import { VERSY_ANDROID_INSTALL_VERSION } from "./versy-analytics-platform";
import { experimentInstallCohort } from "./app-experiment-cohort";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import { marketCountry } from "./analytics-markets";

const steps = (rows: [string, string, ("branch" | "paywall")?][]): UserJourneyStep[] => rows.map(([key, label, type]) => ({
  attribute: `onboarding_${key}`, label, ...(type ? { [type]: true } : {}),
}));
const widget = steps([
  ["entry", "Welcome"], ["age", "Age"], ["name", "Name"], ["gender", "Gender"], ["relationship", "Relationship"],
  ["faithTransition", "Faith intro"], ["familiarity", "Bible familiarity"], ["practice", "Faith practice"], ["closeness", "Closeness to God"],
  ["denomination", "Denomination"], ["preferencesTransition", "Preferences intro"], ["checkIn", "Daily check-in"], ["streakGoal", "Streak goal"],
  ["streakIntro", "Streak"], ["habit", "Reading habit"], ["notifications", "Reminders"], ["notificationsDenied", "Reminders denied", "branch"],
  ["icon", "Icon"], ["theme", "Theme"], ["pathMessage", "Personal path"], ["journeyTransition", "Journey intro"],
  ["relationshipWithGod", "Relationship with God"], ["widget", "Widget setup"], ["feeling", "Feeling"], ["feelingReason", "Feeling reason"],
  ["struggles", "Struggles"], ["gratitude", "Gratitude"], ["futureTransition", "Future intro"], ["futureGoal", "Future goal"], ["improve", "Improvement"],
  ["versePrayerTransition", "Prayer intro"], ["reviews", "Reviews"], ["teamNote", "Founder note", "branch"], ["premiumIntro", "Premium preview"],
  ["trialReminder", "Trial reminder"], ["paywall", "Paywall", "paywall"],
]);
const definition: UserJourneyDefinition = {
  title: "User journey", variantAttribute: "onboardingJourney", minimumInstallVersion: VERSY_ANDROID_INSTALL_VERSION, showEmptyVariants: true,
  variants: [
    { key: "widget", label: "Full", family: VERSY_ANDROID_ROUTES.widget, steps: widget },
    { key: "widget-shorter", label: "Shorter", family: VERSY_ANDROID_ROUTES.widget,
      steps: widget.filter((step) => !["onboarding_habit", "onboarding_relationshipWithGod"].includes(step.attribute)) },
    { key: "scroll", label: VERSY_ANDROID_ROUTES.scroll, steps: steps([
      ["welcome", "Welcome"], ["scrollingHours", "Scrolling hook"], ["fedYourSoul", "Verse swipe preview"], ["closeness", "Closeness to God"],
      ["familiarity", "Bible familiarity"], ["goal", "Learning goal"], ["obstacle", "Reading obstacle"], ["reassurance", "The Bible can make sense"],
      ["verseStory", "Verse preview"], ["verseExplanation", "Verse explanation"], ["readingHabit", "Reading habit"], ["notifications", "Reminders", "branch"],
      ["reviews", "Reviews"], ["teamNote", "Founder note", "branch"], ["goDeeper", "Premium preview"], ["benefits", "Benefits"],
      ["remindPromise", "Trial reminder", "branch"], ["trial", "Paywall", "paywall"],
    ]) },
  ],
};

const eventRoute: Record<string, string> = { widget: "bible_widget", "widget-shorter": "bible_widget_shorter", scroll: "scroll_the_bible" };
export type AndroidJourneyEvent = { screen: string; variant: string; seenAt: number };
type Install = Parameters<typeof versionCohortConversions>[0][number] & { country: string };
type Event = Parameters<typeof versionCohortConversions>[1][number];

export function buildVersyAndroidJourney(installs: Install[], events: Event[], attributes: Map<string, Record<string, string>>,
  screens: Map<string, AndroidJourneyEvent[]>, asOf: number): UserJourneyReport & { countries: Record<string, UserJourneyReport> } {
  const eligible = experimentInstallCohort(installs, VERSY_ANDROID_INSTALL_VERSION, asOf);
  const enrolled = eligible.flatMap((install) => {
    const assignment = androidOnboardingAssignment(attributes.get(install.appUserId), asOf);
    return assignment ? [{ install, ...assignment }] : [];
  });
  function build(members: typeof enrolled): UserJourneyReport {
    const counts = definition.variants.flatMap((variant) => {
      const cohort = members.filter((member) => member.route === variant.key);
      const reached = new Map<string, number>();
      for (const member of cohort) {
        const seen = new Set((screens.get(member.install.appUserId) ?? []).filter((event) => event.variant === eventRoute[member.route]
          && event.seenAt >= Math.max(member.install.installedAt, member.assignedAt) && event.seenAt <= asOf).map((event) => event.screen));
        const scroll = member.route === "scroll";
        seen.add(scroll ? "onboarding_welcome" : "onboarding_entry"); // Android records enrollment on Welcome.
        if (member.viewedAt !== null) seen.add(scroll ? "onboarding_trial" : "onboarding_paywall");
        for (const screen of seen) reached.set(screen, (reached.get(screen) ?? 0) + 1);
      }
      return [{ variant: variant.key, key: ASSIGNED_KEY, users: cohort.length },
        ...[...reached].map(([key, users]) => ({ variant: variant.key, key, users }))];
    });
    const report = buildUserJourney(definition, counts);
    return { ...report, variants: report.variants.map((variant) => {
      const cohort = members.filter((member) => member.route === variant.key);
      const conversions = versionCohortConversions(cohort.map(({ install }) => ({ ...install, appVersion: "0" })),
        events, attributes, 0, asOf + 1, asOf, new Map(cohort.map(({ install, assignedAt }) => [install.appUserId, assignedAt]))).get("0")
        ?? emptyVersionConversions();
      return { ...variant, conversions };
    }) };
  }
  const versions = [...new Set(eligible.map((install) => journeyVersion(install.appVersion)))].map((version) => {
    const members = enrolled.filter(({ install }) => journeyVersion(install.appVersion) === version);
    return { version, installs: eligible.filter((install) => journeyVersion(install.appVersion) === version).length,
      tracked: members.length, variants: build(members).variants };
  });
  const countries = Object.fromEntries([...new Set(eligible.map((install) => marketCountry(install.country)))].map((country) =>
    [country, build(enrolled.filter(({ install }) => marketCountry(install.country) === country))]));
  return { ...build(enrolled), versions, countries };
}
