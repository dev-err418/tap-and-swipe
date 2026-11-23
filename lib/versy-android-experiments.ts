export const VERSY_ANDROID_YEARLY_EXPERIMENT = "versy_android_yearly_price_3999_4499_4999_v1";
export const VERSY_ANDROID_RECOVERY_EXPERIMENT = "versy_android_recovery_price_1999_2499_v1";
export const VERSY_ANDROID_NOTE_EXPERIMENT = "versy_android_paywall_note_v1";
export const VERSY_ANDROID_FLOW_EXPERIMENT = "versy_android_paywall_flow_v1";
export const VERSY_ANDROID_NOTE_ATTRIBUTE = `vn1_${VERSY_ANDROID_NOTE_EXPERIMENT}`;
export const VERSY_ANDROID_FLOW_ATTRIBUTE = `apf1_${VERSY_ANDROID_FLOW_EXPERIMENT}`;

const PLAY_SUBSCRIPTION = "com.arthurbuildsstuff.bible.premium";
export const VERSY_ANDROID_YEARLY_PRICES = [
  { key: "lower", label: "€39.99/year (7d)", productID: `${PLAY_SUBSCRIPTION}:yearly-nov20-lower:free-trial` },
  { key: "middle", label: "€44.99/year (7d)", productID: `${PLAY_SUBSCRIPTION}:yearly-nov20-middle:free-trial` },
  { key: "higher", label: "€49.99/year (7d)", productID: `${PLAY_SUBSCRIPTION}:yearly-nov20-higher:free-trial` },
] as const;
export const VERSY_ANDROID_RECOVERY_PRICES = [
  { key: "lower", label: "€19.99/year", productID: `${PLAY_SUBSCRIPTION}:yearly-daily-gift:sw-none` },
  { key: "higher", label: "€24.99/year", productID: `${PLAY_SUBSCRIPTION}:yearly-nov20-recovery:sw-none` },
] as const;

const PRICING = {
  yearly_price: { experiment: VERSY_ANDROID_YEARLY_EXPERIMENT, allocation: "equal_thirds", prices: VERSY_ANDROID_YEARLY_PRICES },
  recovery_price: { experiment: VERSY_ANDROID_RECOVERY_EXPERIMENT, allocation: "50_50", prices: VERSY_ANDROID_RECOVERY_PRICES },
} as const;
export type VersyAndroidPriceKind = keyof typeof PRICING;
export const VERSY_ANDROID_ATTRIBUTE_KEYS = ["build_environment", VERSY_ANDROID_NOTE_ATTRIBUTE, VERSY_ANDROID_FLOW_ATTRIBUTE,
  ...Object.values(PRICING).map(({ experiment }) => `vp1_${experiment}`)];

export function parseScalarAssignment(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function androidPriceAssignment(attributes: Record<string, string> | undefined, kind: VersyAndroidPriceKind) {
  const definition = PRICING[kind];
  const record = parseScalarAssignment(attributes?.[`vp1_${definition.experiment}`]);
  if (!record || record.schema !== 1 || record.platform !== "android" || record.environment !== "production"
    || record.experiment !== definition.experiment || record.allocation !== definition.allocation || record.randomized !== true) return null;
  const price = definition.prices.find(({ key, productID }) => key === record.variant && productID === record.productID);
  return price && typeof record.assignedAt === "number" ? { productID: price.productID, assignedAt: record.assignedAt } : null;
}

export const VERSY_ANDROID_ROUTES = { widget: "Bible Widget", "widget-shorter": "Bible Short", scroll: "Bible Scroll" } as const;

export function androidOnboardingAssignment(attributes: Record<string, string> | undefined, asOf: number) {
  const record = parseScalarAssignment(attributes?.[VERSY_ANDROID_FLOW_ATTRIBUTE]);
  if (!record || record.schema !== 1 || record.platform !== "android" || record.environment !== "production"
    || record.experiment !== VERSY_ANDROID_FLOW_EXPERIMENT || record.variant !== "dismissible"
    || record.allocation !== "100_dismissible" || record.randomized !== false
    || typeof record.onboardingJourney !== "string" || !Object.hasOwn(VERSY_ANDROID_ROUTES, record.onboardingJourney)
    || typeof record.assignedAt !== "number" || !Number.isFinite(record.assignedAt)
    || record.assignedAt <= 0 || record.assignedAt > asOf) return null;
  return { route: record.onboardingJourney, assignedAt: record.assignedAt,
    viewedAt: typeof record.viewedAt === "number" && record.viewedAt >= record.assignedAt && record.viewedAt <= asOf ? record.viewedAt : null };
}
