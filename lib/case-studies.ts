import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { calculateReadingTime, type GuestInfo } from "./content";

const CASE_STUDIES_DIR = path.join(process.cwd(), "content", "case-studies");

export type { GuestInfo };

export interface CaseStudyMeta {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  image?: string;
  imageAlt?: string;
  guest?: string;
  guestInfo?: GuestInfo;
  tags?: string[];
  appSlug?: string;
  appStoreId?: string;
  playStoreId?: string;
  episodeSlug?: string;
  readingTime: number;
  slug: string;
}

export interface CaseStudy extends CaseStudyMeta {
  content: string;
}

export function getAllCaseStudies(): CaseStudyMeta[] {
  if (!fs.existsSync(CASE_STUDIES_DIR)) return [];

  const files = fs
    .readdirSync(CASE_STUDIES_DIR)
    .filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(CASE_STUDIES_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      return {
        title: data.title,
        description: data.description,
        date: data.date,
        updatedDate: data.updatedDate,
        image: data.image,
        imageAlt: data.imageAlt,
        guest: data.guest,
        guestInfo: data.guestInfo,
        tags: data.tags,
        appSlug: data.appSlug,
        appStoreId: data.appStoreId,
        playStoreId: data.playStoreId,
        episodeSlug: data.episodeSlug,
        readingTime: calculateReadingTime(content),
        slug,
      } satisfies CaseStudyMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getCaseStudyBySlug(slug: string): CaseStudy | null {
  const filePath = path.join(CASE_STUDIES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    title: data.title,
    description: data.description,
    date: data.date,
    updatedDate: data.updatedDate,
    image: data.image,
    imageAlt: data.imageAlt,
    guest: data.guest,
    guestInfo: data.guestInfo,
    tags: data.tags,
    appSlug: data.appSlug,
    appStoreId: data.appStoreId,
    playStoreId: data.playStoreId,
    episodeSlug: data.episodeSlug,
    readingTime: calculateReadingTime(content),
    slug,
    content,
  };
}

export function getAllCaseStudySlugs(): string[] {
  if (!fs.existsSync(CASE_STUDIES_DIR)) return [];

  return fs
    .readdirSync(CASE_STUDIES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
