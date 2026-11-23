export type VersyAnalyticsPlatform = "ios" | "android";

export function versyAnalyticsPlatform(value: unknown): VersyAnalyticsPlatform {
  return value === "android" ? "android" : "ios";
}

export function platformAnalyticsStorageKey(appId: string, platform: unknown): string {
  return appId === "versy" && platform === "android" ? "versy-android" : appId;
}

export const VERSY_ANDROID_INSTALL_VERSION = "2.0.0";

export function versyClientEvents(platform: VersyAnalyticsPlatform): string {
  const explicit = "lower(ifNull(toString(properties.platform), ''))";
  const os = "lower(ifNull(toString(properties.$os), ''))";
  const device = platform === "android" ? `${explicit} = 'android'`
    : `(${explicit} = 'ios' OR (${explicit} = '' AND ${os} IN ('ios', 'ipados')))`;
  return `(properties.app_environment = 'production' AND ${device})`;
}

export function versyStoreEvents(platform: VersyAnalyticsPlatform): string {
  const [store, bundle] = platform === "android"
    ? ["PLAY_STORE", "com.arthurbuildsstuff.bible_verse_widget"]
    : ["APP_STORE", "com.arthurbuildsstuff.bible-verse-widget"];
  return `(lower(toString(properties.environment)) = 'production' AND properties.store = '${store}' AND properties.bundleId = '${bundle}')`;
}
