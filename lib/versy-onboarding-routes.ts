/** New assignments only; saved v1 routes keep their original experiment. */
export const VERSY_ONBOARDING_EXPERIMENT = "scroll_the_bible_v2";
export const VERSY_ONBOARDING_REPORT = "versy-scroll-the-bible-v2";
export const VERSY_ONBOARDING_ROUTES = [
  { key: "bible_widget_shorter", label: "Bible Short", percent: 100 / 3 },
  { key: "scroll_the_bible", label: "Bible Scroll · Current", percent: 200 / 9 },
  { key: "scroll_the_bible_animations", label: "Bible Scroll · Animations", percent: 200 / 9 },
  { key: "scroll_the_bible_videos", label: "Bible Scroll · Videos", percent: 200 / 9 },
] as const;
export const VERSY_ONBOARDING_V2_VARIANTS = VERSY_ONBOARDING_ROUTES.map(({ key, label }) => ({
  key, label, attributes: { onboarding_experiment_id: VERSY_ONBOARDING_EXPERIMENT,
    onboarding_variant: key, versy_tracking_environment: "production" },
}));
export function isVersyScrollRoute(route: unknown): boolean {
  return ["scroll_the_bible", "scroll_the_bible_animations", "scroll_the_bible_videos"].includes(String(route));
}
