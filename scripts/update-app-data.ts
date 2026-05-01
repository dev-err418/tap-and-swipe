/**
 * Fetch app store data for all stories and case studies with store IDs.
 *
 * Usage:
 *   npx tsx scripts/update-app-data.ts
 *
 * - Reads MDX frontmatter from content/episodes/ and content/case-studies/
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
const EPISODES_DIR = path.join(ROOT, "content", "episodes");
const CASE_STUDIES_DIR = path.join(ROOT, "content", "case-studies");
const DRAFTS_DIR = path.join(ROOT, "content", "drafts");
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

// Pull `<AppShowcase appSlug="..." appStoreId="..." playStoreId="..." />`
// references out of the MDX body. Used for secondary apps mentioned inline
// in an article (e.g. a founder's second / third app).
function scanInlineAppShowcases(content: string): AppEntry[] {
  const entries: AppEntry[] = [];
  const tagRe = /<AppShowcase\b([^>]*?)\/>/g;
  for (const match of content.matchAll(tagRe)) {
    const attrs = match[1];
    const slug = /appSlug=["']([^"']+)["']/.exec(attrs)?.[1];
    if (!slug) continue;
    const appStoreId = /appStoreId=["']([^"']+)["']/.exec(attrs)?.[1];
    const playStoreId = /playStoreId=["']([^"']+)["']/.exec(attrs)?.[1];
    if (!appStoreId && !playStoreId) continue;
    entries.push({ appSlug: slug, appStoreId, playStoreId });
  }
  return entries;
}

function scanDir(dir: string): AppEntry[] {
  if (!fs.existsSync(dir)) return [];

  const out: AppEntry[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);

    // Primary app from frontmatter
    const appSlug = data.appSlug as string | undefined;
    const appStoreId = data.appStoreId as string | undefined;
    const playStoreId = data.playStoreId as string | undefined;
    if (appSlug && (appStoreId || playStoreId)) {
      out.push({ appSlug, appStoreId, playStoreId });
    }

    // Secondary apps referenced inline in the body via <AppShowcase ... />
    out.push(...scanInlineAppShowcases(content));
  }
  return out;
}

// ── iTunes API ─────────────────────────────────────────────────────

// iTunes Search API skips subtitle for many apps and sometimes returns
// empty screenshotUrls (e.g. for paid apps and brand-new releases). The
// canonical source is the App Store web page itself, which embeds a JSON
// blob in <script id="serialized-server-data"> with both fields. We scrape
// it as a fallback / override for those two specific fields. Other fields
// (rating, price, store URL) come from iTunes since the contract is stable.
async function fetchAppStoreWebData(
  appStoreId: string
): Promise<{ subtitle?: string; screenshotUrls: string[] }> {
  try {
    const res = await fetch(
      `https://apps.apple.com/us/app/id${appStoreId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    if (!res.ok) return { screenshotUrls: [] };
    const html = await res.text();
    const match = html.match(
      /<script type="application\/json" id="serialized-server-data">([\s\S]+?)<\/script>/
    );
    if (!match) return { screenshotUrls: [] };

    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch {
      return { screenshotUrls: [] };
    }

    let subtitle: string | undefined;
    function findLockup(obj: unknown): boolean {
      if (!obj || typeof obj !== "object") return false;
      if (Array.isArray(obj)) return obj.some(findLockup);
      const o = obj as Record<string, unknown>;
      const lockup = o.lockup;
      if (lockup && typeof lockup === "object") {
        const l = lockup as Record<string, unknown>;
        if (typeof l.subtitle === "string" && l.subtitle.length > 0) {
          subtitle = l.subtitle;
          return true;
        }
      }
      return Object.values(o).some(findLockup);
    }
    findLockup(data);

    const screenshotUrls: string[] = [];
    function walkUrls(obj: unknown) {
      if (typeof obj === "string") {
        if (
          obj.includes("mzstatic.com") &&
          /\/SC_[0-9]+\.jpg\//.test(obj) &&
          !obj.includes("Placeholder")
        ) {
          // Template URLs end in `/{w}x{h}{c}.{f}` — substitute a high-res
          // png so the downloader gets a usable image.
          const concrete = obj
            .replace("{w}x{h}{c}.{f}", "1290x2796bb.png")
            .replace("{w}x{h}", "1290x2796");
          if (!screenshotUrls.includes(concrete)) screenshotUrls.push(concrete);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(walkUrls);
      } else if (obj && typeof obj === "object") {
        Object.values(obj as Record<string, unknown>).forEach(walkUrls);
      }
    }
    walkUrls(data);

    return { subtitle, screenshotUrls };
  } catch (err) {
    console.warn(
      `  ⚠ App Store web scrape failed for ${appStoreId}:`,
      (err as Error).message
    );
    return { screenshotUrls: [] };
  }
}

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

  // Scrape the App Store page in parallel for the fields iTunes is unreliable
  // about (subtitle, screenshots).
  const webData = await fetchAppStoreWebData(appStoreId);

  const assetsDir = path.join(PUBLIC_APPS_DIR, slug);
  ensureDir(assetsDir);

  // Icon
  const iconUrl = (app.artworkUrl512 as string) || (app.artworkUrl100 as string);
  const iconPath = `/apps/${slug}/icon-ios.webp`;
  if (iconUrl) {
    await downloadImage(iconUrl, path.join(PUBLIC_APPS_DIR, slug, "icon-ios.webp"));
  }

  // Screenshots: prefer the scraped list (more reliable) and fall back to
  // whatever iTunes returned. Cap at 5.
  const itunesScreens = (app.screenshotUrls as string[]) || [];
  const screenshotSources = (
    webData.screenshotUrls.length > 0 ? webData.screenshotUrls : itunesScreens
  ).slice(0, 5);

  const screenshots: string[] = [];
  for (let i = 0; i < screenshotSources.length; i++) {
    const dest = `/apps/${slug}/ios-${i + 1}.webp`;
    const ok = await downloadImage(
      screenshotSources[i],
      path.join(PUBLIC_APPS_DIR, slug, `ios-${i + 1}.webp`)
    );
    if (ok) screenshots.push(dest);
  }

  return {
    title: app.trackName as string,
    subtitle: webData.subtitle || (app.subtitle as string) || undefined,
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
  topCountries?: string[];
  genres?: string[];
  rating?: number;
  ratingCount?: number;
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
  // SensorTower's public API blocks datacenter IPs (Coolify, GitHub Actions,
  // and most cloud providers all return empty responses), so this script is
  // intended to be run from a residential IP — i.e. your laptop.
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

      const topCountries = app.top_countries as string[] | undefined;
      const categories = app.categories as Array<number | string> | undefined;
      const genres = categories?.length
        ? mapCategories(platform, categories)
        : undefined;

      // global_rating_count counts ratings across every storefront, so we
      // prefer it over iTunes' per-country count and Google Play's number.
      const rating =
        typeof app.rating === "number" ? (app.rating as number) : undefined;
      const ratingCount =
        typeof app.global_rating_count === "number"
          ? (app.global_rating_count as number)
          : undefined;

      map.set(appId, { topCountries, genres, rating, ratingCount });
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

  // Scan all three content dirs (drafts included so app cards render in review)
  const episodeEntries = scanDir(EPISODES_DIR);
  const caseStudyEntries = scanDir(CASE_STUDIES_DIR);
  const draftEntries = scanDir(DRAFTS_DIR);

  // Deduplicate by appSlug — merge store IDs from all content types
  const appMap = new Map<string, AppEntry>();
  for (const entry of [...episodeEntries, ...caseStudyEntries, ...draftEntries]) {
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
        appData.ios.topCountries = stData.topCountries;
        if (stData.genres?.length) appData.ios.genres = stData.genres;
        // Override the storefront-specific iTunes counts with the global
        // numbers when SensorTower has them.
        if (stData.rating != null) appData.ios.rating = stData.rating;
        if (stData.ratingCount != null) appData.ios.ratingCount = stData.ratingCount;
      }
    }

    if (app.playStoreId) {
      appData.android = await fetchAndroidData(app.playStoreId, app.appSlug);
      const stData = stAndroid.get(app.playStoreId);
      if (appData.android && stData) {
        appData.android.topCountries = stData.topCountries;
        if (stData.genres?.length) appData.android.genres = stData.genres;
        if (stData.rating != null) appData.android.rating = stData.rating;
        if (stData.ratingCount != null) appData.android.ratingCount = stData.ratingCount;
      }
    }

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
