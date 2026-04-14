import fs from "fs";
import path from "path";

const APP_DATA_DIR = path.join(process.cwd(), "content", "app-data");

export interface PlatformData {
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

export interface AppData {
  lastUpdated: string;
  downloadsEstimate?: string;
  revenueEstimate?: string;
  ios?: PlatformData;
  android?: PlatformData;
}

export function getAppData(slug: string): AppData | null {
  const filePath = path.join(APP_DATA_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}
