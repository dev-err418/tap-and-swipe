/**
 * Fetch app store data for all episodes with store IDs.
 *
 * Usage:
 *   npx tsx scripts/update-app-data.ts
 *
 * - Reads episode MDX frontmatter for appStoreId / playStoreId
 * - Fetches metadata from iTunes Search API + google-play-scraper
 * - Downloads icons + screenshots as webp to public/apps/{slug}/
 * - Writes JSON to content/app-data/{slug}.json
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import gplay from "google-play-scraper";
import sharp from "sharp";

// ── Paths ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const EPISODES_DIR = path.join(ROOT, "content", "episodes");
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
  genre?: string;
  storeUrl?: string;
}

interface AppData {
  lastUpdated: string;
  downloadsEstimate?: string;
  revenueEstimate?: string;
  ios?: PlatformData;
  android?: PlatformData;
}

interface EpisodeFrontmatter {
  slug: string;
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
    genre: app.primaryGenreName as string | undefined,
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
      genre: app.genre || undefined,
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

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("Reading episode frontmatter...\n");

  const files = fs.readdirSync(EPISODES_DIR).filter((f) => f.endsWith(".mdx"));
  const episodes: EpisodeFrontmatter[] = files
    .map((file) => {
      const raw = fs.readFileSync(path.join(EPISODES_DIR, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        appStoreId: data.appStoreId as string | undefined,
        playStoreId: data.playStoreId as string | undefined,
      };
    })
    .filter((ep) => ep.appStoreId || ep.playStoreId);

  if (episodes.length === 0) {
    console.log("No episodes with store IDs found.");
    return;
  }

  ensureDir(APP_DATA_DIR);

  for (const ep of episodes) {
    console.log(`\n── ${ep.slug} ──`);

    const appData: AppData = {
      lastUpdated: new Date().toISOString(),
    };

    if (ep.appStoreId) {
      appData.ios = await fetchIosData(ep.appStoreId, ep.slug);
    }

    if (ep.playStoreId) {
      appData.android = await fetchAndroidData(ep.playStoreId, ep.slug);
    }

    // Write JSON
    const outPath = path.join(APP_DATA_DIR, `${ep.slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(appData, null, 2) + "\n");
    console.log(`  ✓ Wrote ${outPath}`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
