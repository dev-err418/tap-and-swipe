import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { GuestInfo } from "./content";

const STORIES_DIR = path.join(process.cwd(), "content", "stories");

export type { GuestInfo };

export interface StoryMeta {
  title: string;
  description: string;
  date: string;
  guest?: string;
  guestInfo?: GuestInfo;
  youtubeId: string;
  appSlug?: string;
  appStoreId?: string;
  playStoreId?: string;
  tags?: string[];
  image?: string;
  caseStudySlug?: string;
  slug: string;
}

export interface Story extends StoryMeta {
  content: string;
}

export function getAllStories(): StoryMeta[] {
  if (!fs.existsSync(STORIES_DIR)) return [];

  const files = fs
    .readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(STORIES_DIR, file), "utf-8");
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
      } satisfies StoryMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getStoryBySlug(slug: string): Story | null {
  const filePath = path.join(STORIES_DIR, `${slug}.mdx`);
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

export function getAllStorySlugs(): string[] {
  if (!fs.existsSync(STORIES_DIR)) return [];

  return fs
    .readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
