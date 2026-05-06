export const CATEGORIES = [
  { slug: "getting-started", shortCode: "g", title: "Getting started", subtitle: "Set up your tools and environment", emoji: "🚀", order: 1, image: "/learn/getting-started.webp" },
  { slug: "find-your-idea", shortCode: "i", title: "Find your idea", subtitle: "Discover a profitable app concept", emoji: "💡", order: 2, image: "/learn/find-your-idea.webp" },
  { slug: "design", shortCode: "d", title: "Design", subtitle: "Create beautiful screens that convert", emoji: "🎨", order: 3, image: "/learn/design.webp" },
  { slug: "build", shortCode: "b", title: "Build basics", subtitle: "Code your app from scratch", emoji: "💻", order: 4, image: "/learn/build.webp" },
  { slug: "build-with-boilerplate", shortCode: "bw", title: "Build with the boilerplate", subtitle: "Ship faster with the starter template", emoji: "⚡", order: 5, image: "/learn/build-with-boilerplate.webp" },
  { slug: "monetize", shortCode: "m", title: "Monetize", subtitle: "Add subscriptions and maximize revenue", emoji: "💳", order: 6, image: "/learn/monetize.webp" },
  { slug: "launch-and-grow", shortCode: "l", title: "Launch & grow", subtitle: "Get featured and acquire your first users", emoji: "📈", order: 7, image: "/learn/launch-and-grow.webp" },
  { slug: "scaling", shortCode: "s", title: "Scaling", subtitle: "Grow beyond your first 1,000 users", emoji: "📊", order: 8, image: "/learn/scaling.webp" },
  { slug: "weekly-calls", shortCode: "w", title: "Weekly call replays", subtitle: "Live Q&A sessions with the community", emoji: "🎙️", order: 9 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const STARTER_LOCKED_SLUGS: CategorySlug[] = [
  "build-with-boilerplate",
  "scaling",
];

export function isStarterLocked(slug: string): boolean {
  return (STARTER_LOCKED_SLUGS as readonly string[]).includes(slug);
}

export function buildLessonShortPath(categorySlug: string, lessonId: string): string | null {
  const category = CATEGORIES.find((c) => c.slug === categorySlug);
  if (!category) return null;
  const match = lessonId.match(/^seed-.+-(\d+)$/);
  if (!match) return null;
  return `/l/${category.shortCode}${match[1]}`;
}

export function parseLessonShortCode(code: string): { slug: CategorySlug; lessonId: string } | null {
  const m = code.match(/^([a-z]+)(\d+)$/);
  if (!m) return null;
  const [, prefix, orderStr] = m;
  const category = CATEGORIES.find((c) => c.shortCode === prefix);
  if (!category) return null;
  return { slug: category.slug, lessonId: `seed-${category.slug}-${orderStr}` };
}
