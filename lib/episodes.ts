import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { GuestInfo } from "./content";

const EPISODES_DIR = path.join(process.cwd(), "content", "episodes");

export type { GuestInfo };

export interface EpisodeMeta {
  title: string;
  description: string;
  date: string;
  guest?: string;
  guestInfo?: GuestInfo;
  youtubeId?: string;
  appSlug?: string;
  appStoreId?: string;
  playStoreId?: string;
  tags?: string[];
  image?: string;
  caseStudySlug?: string;
  slug: string;
}

export interface Episode extends EpisodeMeta {
  content: string;
}

export function getAllEpisodes(): EpisodeMeta[] {
  if (!fs.existsSync(EPISODES_DIR)) return [];

  const files = fs
    .readdirSync(EPISODES_DIR)
    .filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(EPISODES_DIR, file), "utf-8");
      const { data } = matter(raw);

      return {
        title: data.title,
        description: data.description,
        date: data.date,
        guest: data.guest,
        guestInfo: data.guestInfo,
        youtubeId: data.youtubeId,
        appSlug: data.appSlug,
        appStoreId: data.appStoreId,
        playStoreId: data.playStoreId,
        tags: data.tags,
        image: data.image,
        caseStudySlug: data.caseStudySlug,
        slug,
      } satisfies EpisodeMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getEpisodeBySlug(slug: string): Episode | null {
  const filePath = path.join(EPISODES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    title: data.title,
    description: data.description,
    date: data.date,
    guest: data.guest,
    guestInfo: data.guestInfo,
    youtubeId: data.youtubeId,
    appSlug: data.appSlug,
    appStoreId: data.appStoreId,
    playStoreId: data.playStoreId,
    tags: data.tags,
    image: data.image,
    caseStudySlug: data.caseStudySlug,
    slug,
    content,
  };
}

export function getAllEpisodeSlugs(): string[] {
  if (!fs.existsSync(EPISODES_DIR)) return [];

  return fs
    .readdirSync(EPISODES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
