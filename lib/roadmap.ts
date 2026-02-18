export const CATEGORIES = [
  { slug: "idea-validation", title: "Idea & Validation", emoji: "💡", order: 1 },
  { slug: "design-ui-ux", title: "Design UI/UX", emoji: "🎨", order: 2 },
  { slug: "development", title: "Development", emoji: "💻", order: 3 },
  { slug: "paywall-monetization", title: "Paywall & Monetization", emoji: "💳", order: 4 },
  { slug: "marketing", title: "Marketing", emoji: "📈", order: 5 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
