/**
 * Fetch app store data for all stories and case studies with store IDs.
 *
 * Usage:
 *   npx tsx scripts/update-app-data.ts
 *
 * - Reads MDX frontmatter from content/stories/ and content/case-studies/
 * - Deduplicates by appSlug — fetches once per unique app
 * - Fetches metadata from iTunes Search API + google-play-scraper
 * - Downloads icons + screenshots as webp to public/apps/{appSlug}/
 * - Writes JSON to content/app-data/{appSlug}.json
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import gplay from "google-play-scraper";
import sharp from "sharp";

// ── Paths ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const STORIES_DIR = path.join(ROOT, "content", "stories");
const CASE_STUDIES_DIR = path.join(ROOT, "content", "case-studies");
const APP_DATA_DIR = path.join(ROOT, "content", "app-data");
const PUBLIC_APPS_DIR = path.join(ROOT, "public", "apps");

// ── Types ──────────────────────────────────────────────────────────

interface PlatformData {
  title: string;
  subtitle?: string;
  icon: string;
  screenshots: string[];
  rating?: number;
  ratingCount?: number;
  price: string;
  genres?: string[];
  storeUrl?: string;
  downloadsEstimate?: string;
  revenueEstimate?: string;
  topCountries?: string[];
}

interface AppData {
  lastUpdated: string;
  ios?: PlatformData;
  android?: PlatformData;
}

interface AppEntry {
  appSlug: string;
  appStoreId?: string;
  playStoreId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function downloadImage(
  url: string,
  destPath: string
): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    await sharp(buffer).webp({ quality: 80 }).toFile(destPath);
    return true;
  } catch (err) {
    console.warn(`  ⚠ Failed to download ${url}:`, (err as Error).message);
    return false;
  }
}

function scanDir(dir: string): AppEntry[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      const appSlug = data.appSlug as string | undefined;
      if (!appSlug) return null;
      return {
        appSlug,
        appStoreId: data.appStoreId as string | undefined,
        playStoreId: data.playStoreId as string | undefined,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null && !!(e.appStoreId || e.playStoreId));
}

// ── iTunes API ─────────────────────────────────────────────────────

async function fetchIosData(
  appStoreId: string,
  slug: string
): Promise<PlatformData | undefined> {
  console.log(`  Fetching iOS data for ${appStoreId}...`);
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${appStoreId}`
  );
  if (!res.ok) {
    console.warn(`  ⚠ iTunes API returned ${res.status}`);
    return undefined;
  }

  const json = (await res.json()) as {
    resultCount: number;
    results: Array<Record<string, unknown>>;
  };
  if (json.resultCount === 0) {
    console.warn(`  ⚠ No results for iOS app ${appStoreId}`);
    return undefined;
  }

  const app = json.results[0];
  const assetsDir = path.join(PUBLIC_APPS_DIR, slug);
  ensureDir(assetsDir);

  // Icon
  const iconUrl = (app.artworkUrl512 as string) || (app.artworkUrl100 as string);
  const iconPath = `/apps/${slug}/icon-ios.webp`;
  if (iconUrl) {
    await downloadImage(iconUrl, path.join(PUBLIC_APPS_DIR, slug, "icon-ios.webp"));
  }

  // Screenshots (max 5)
  const screenshotUrls = ((app.screenshotUrls as string[]) || []).slice(0, 5);
  const screenshots: string[] = [];
  for (let i = 0; i < screenshotUrls.length; i++) {
    const dest = `/apps/${slug}/ios-${i + 1}.webp`;
    const ok = await downloadImage(
      screenshotUrls[i],
      path.join(PUBLIC_APPS_DIR, slug, `ios-${i + 1}.webp`)
    );
    if (ok) screenshots.push(dest);
  }

  return {
    title: app.trackName as string,
    subtitle: (app.subtitle as string) || undefined,
    icon: iconPath,
    screenshots,
    rating: app.averageUserRating as number | undefined,
    ratingCount: app.userRatingCount as number | undefined,
    price: (app.formattedPrice as string) || "Free",
    storeUrl: app.trackViewUrl as string | undefined,
  };
}

// ── Google Play ────────────────────────────────────────────────────

async function fetchAndroidData(
  playStoreId: string,
  slug: string
): Promise<PlatformData | undefined> {
  console.log(`  Fetching Android data for ${playStoreId}...`);
  try {
    const app = await gplay.app({ appId: playStoreId });
    const assetsDir = path.join(PUBLIC_APPS_DIR, slug);
    ensureDir(assetsDir);

    // Icon
    const iconPath = `/apps/${slug}/icon-android.webp`;
    if (app.icon) {
      await downloadImage(
        app.icon,
        path.join(PUBLIC_APPS_DIR, slug, "icon-android.webp")
      );
    }

    // Screenshots (max 5)
    const screenshotUrls = (app.screenshots || []).slice(0, 5);
    const screenshots: string[] = [];
    for (let i = 0; i < screenshotUrls.length; i++) {
      const dest = `/apps/${slug}/android-${i + 1}.webp`;
      const ok = await downloadImage(
        screenshotUrls[i],
        path.join(PUBLIC_APPS_DIR, slug, `android-${i + 1}.webp`)
      );
      if (ok) screenshots.push(dest);
    }

    return {
      title: decodeHtmlEntities(app.title),
      subtitle: app.summary ? decodeHtmlEntities(app.summary) : undefined,
      icon: iconPath,
      screenshots,
      rating: app.score || undefined,
      ratingCount: app.ratings || undefined,
      price: app.free ? "Free" : `${app.priceText || app.price}`,
      storeUrl: app.url || undefined,
    };
  } catch (err) {
    console.warn(
      `  ⚠ Google Play scrape failed for ${playStoreId}:`,
      (err as Error).message
    );
    return undefined;
  }
}

// ── Category mappings ─────────────────────────────────────────────

const IOS_CATEGORIES: Record<number, string> = {
  6000: "Business",
  6001: "Weather",
  6002: "Utilities",
  6003: "Travel",
  6004: "Sports",
  6005: "Social Networking",
  6006: "Reference",
  6007: "Productivity",
  6008: "Photo & Video",
  6009: "News",
  6010: "Navigation",
  6011: "Music",
  6012: "Lifestyle",
  6013: "Health & Fitness",
  6014: "Games",
  6015: "Finance",
  6016: "Entertainment",
  6017: "Education",
  6018: "Books",
  6020: "Medical",
  6021: "Magazines & Newspapers",
  6023: "Food & Drink",
  6024: "Shopping",
  6026: "Developer Tools",
  6027: "Graphics & Design",
};

const ANDROID_CATEGORIES: Record<string, string> = {
  art_and_design: "Art & Design",
  auto_and_vehicles: "Auto & Vehicles",
  beauty: "Beauty",
  books_and_reference: "Books & Reference",
  business: "Business",
  comics: "Comics",
  communication: "Communication",
  dating: "Dating",
  education: "Education",
  entertainment: "Entertainment",
  events: "Events",
  finance: "Finance",
  food_and_drink: "Food & Drink",
  health_and_fitness: "Health & Fitness",
  house_and_home: "House & Home",
  libraries_and_demo: "Libraries & Demo",
  lifestyle: "Lifestyle",
  maps_and_navigation: "Maps & Navigation",
  medical: "Medical",
  music_and_audio: "Music & Audio",
  news_and_magazines: "News & Magazines",
  parenting: "Parenting",
  personalization: "Personalization",
  photography: "Photography",
  productivity: "Productivity",
  shopping: "Shopping",
  social: "Social",
  sports: "Sports",
  tools: "Tools",
  travel_and_local: "Travel & Local",
  video_players: "Video Players & Editors",
  weather: "Weather",
};

function mapCategories(
  platform: "ios" | "android",
  ids: Array<number | string>
): string[] {
  const map = platform === "ios" ? IOS_CATEGORIES : ANDROID_CATEGORIES;
  return ids
    .map((id) => (map as Record<string | number, string>)[id])
    .filter(Boolean);
}

// ── SensorTower (batched) ──────────────────────────────────────────

interface SensorTowerData {
  downloadsEstimate?: string;
  revenueEstimate?: string;
  topCountries?: string[];
  genres?: string[];
}

// Keyed by app ID (numeric iOS ID or Android package name)
type SensorTowerMap = Map<string, SensorTowerData>;

async function fetchSensorTowerBatch(
  platform: "ios" | "android",
  appIds: string[]
): Promise<SensorTowerMap> {
  const map: SensorTowerMap = new Map();
  if (appIds.length === 0) return map;

  const ids = appIds.join(",");
  console.log(`\nFetching SensorTower (${platform}) for ${appIds.length} app(s)...`);

  try {
    const res = await fetch(
      `https://app.sensortower.com/api/${platform}/apps?app_ids=${ids}`
    );
    if (!res.ok) {
      console.warn(`  ⚠ SensorTower ${platform} returned ${res.status}, skipping`);
      return map;
    }

    const json = (await res.json()) as {
      apps: Array<Record<string, unknown>>;
    };
    if (!json.apps?.length) return map;

    for (const app of json.apps) {
      const appId = String(app.app_id ?? app.bundle_id ?? "");
      if (!appId) continue;

      const downloads = app.humanized_worldwide_last_month_downloads as
        | { string: string }
        | undefined;
      const revenue = app.humanized_worldwide_last_month_revenue as
        | { string: string }
        | undefined;
      const topCountries = app.top_countries as string[] | undefined;
      const categories = app.categories as Array<number | string> | undefined;
      const genres = categories?.length
        ? mapCategories(platform, categories)
        : undefined;

      map.set(appId, {
        downloadsEstimate: downloads?.string?.replace(/k\b/g, "K").replace(/< /g, "<"),
        revenueEstimate: revenue?.string?.replace(/k\b/g, "K").replace(/< /g, "<"),
        topCountries,
        genres,
      });
    }

    console.log(`  ✓ Got data for ${map.size} app(s)`);
  } catch (err) {
    console.warn(`  ⚠ SensorTower ${platform} failed:`, (err as Error).message);
  }

  return map;
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("Scanning content directories for appSlug + store IDs...\n");

  // Scan both content dirs
  const storyEntries = scanDir(STORIES_DIR);
  const caseStudyEntries = scanDir(CASE_STUDIES_DIR);

  // Deduplicate by appSlug — merge store IDs from both content types
  const appMap = new Map<string, AppEntry>();
  for (const entry of [...storyEntries, ...caseStudyEntries]) {
    const existing = appMap.get(entry.appSlug);
    if (existing) {
      if (!existing.appStoreId && entry.appStoreId)
        existing.appStoreId = entry.appStoreId;
      if (!existing.playStoreId && entry.playStoreId)
        existing.playStoreId = entry.playStoreId;
    } else {
      appMap.set(entry.appSlug, { ...entry });
    }
  }

  const apps = Array.from(appMap.values());

  if (apps.length === 0) {
    console.log("No content with appSlug + store IDs found.");
    return;
  }

  console.log(`Found ${apps.length} unique app(s): ${apps.map((a) => a.appSlug).join(", ")}\n`);
  ensureDir(APP_DATA_DIR);

  // Batch SensorTower requests (one per platform, all IDs at once)
  const iosIds = apps.map((a) => a.appStoreId).filter(Boolean) as string[];
  const androidIds = apps.map((a) => a.playStoreId).filter(Boolean) as string[];
  const [stIos, stAndroid] = await Promise.all([
    fetchSensorTowerBatch("ios", iosIds),
    fetchSensorTowerBatch("android", androidIds),
  ]);

  for (const app of apps) {
    console.log(`\n── ${app.appSlug} ──`);

    const appData: AppData = {
      lastUpdated: new Date().toISOString(),
    };

    if (app.appStoreId) {
      appData.ios = await fetchIosData(app.appStoreId, app.appSlug);
      const stData = stIos.get(app.appStoreId);
      if (appData.ios && stData) {
        appData.ios.downloadsEstimate = stData.downloadsEstimate;
        appData.ios.revenueEstimate = stData.revenueEstimate;
        appData.ios.topCountries = stData.topCountries;
        if (stData.genres?.length) appData.ios.genres = stData.genres;
      }
    }

    if (app.playStoreId) {
      appData.android = await fetchAndroidData(app.playStoreId, app.appSlug);
      const stData = stAndroid.get(app.playStoreId);
      if (appData.android && stData) {
        appData.android.downloadsEstimate = stData.downloadsEstimate;
        appData.android.revenueEstimate = stData.revenueEstimate;
        appData.android.topCountries = stData.topCountries;
        if (stData.genres?.length) appData.android.genres = stData.genres;
      }
    }

    // Write JSON
    const outPath = path.join(APP_DATA_DIR, `${app.appSlug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(appData, null, 2) + "\n");
    console.log(`  ✓ Wrote ${outPath}`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
