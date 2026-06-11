import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { calculateReadingTime, type GuestInfo } from "./content";
import {
  getPublishedCaseStudyImportBySlug,
  getPublishedCaseStudyImports,
} from "./case-study-imports";

const CASE_STUDIES_DIR = path.join(process.cwd(), "content", "case-studies");

export type { GuestInfo };

export interface CaseStudyMeta {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  image?: string;
  imageAlt?: string;
  author?: string;
  guest?: string;
  guestInfo?: GuestInfo;
  tags?: string[];
  appSlug?: string;
  appStoreId?: string;
  playStoreId?: string;
  revenueAtRecording?: string;
  recordedAt?: string;
  episodeSlug?: string;
  contentFormat?: "mdx" | "markdown";
  readingTime: number;
  slug: string;
}

export interface CaseStudy extends CaseStudyMeta {
  content: string;
}

function sortCaseStudies(caseStudies: CaseStudyMeta[]): CaseStudyMeta[] {
  return caseStudies.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getFileCaseStudies(): CaseStudyMeta[] {
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
        author: data.author,
        guest: data.guest,
        guestInfo: data.guestInfo,
        tags: data.tags,
        appSlug: data.appSlug,
        appStoreId: data.appStoreId,
        playStoreId: data.playStoreId,
        revenueAtRecording: data.revenueAtRecording,
        recordedAt: data.recordedAt,
        episodeSlug: data.episodeSlug,
        readingTime: calculateReadingTime(content),
        slug,
      } satisfies CaseStudyMeta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAllCaseStudies(): Promise<CaseStudyMeta[]> {
  const fileCaseStudies = getFileCaseStudies();
  const fileSlugs = new Set(fileCaseStudies.map((cs) => cs.slug));
  const importedCaseStudies = (await getPublishedCaseStudyImports()).filter(
    (cs) => !fileSlugs.has(cs.slug)
  );

  return sortCaseStudies([...fileCaseStudies, ...importedCaseStudies]);
}

export function getFileCaseStudyBySlug(slug: string): CaseStudy | null {
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
    author: data.author,
    guest: data.guest,
    guestInfo: data.guestInfo,
    tags: data.tags,
    appSlug: data.appSlug,
    appStoreId: data.appStoreId,
    playStoreId: data.playStoreId,
    revenueAtRecording: data.revenueAtRecording,
    recordedAt: data.recordedAt,
    episodeSlug: data.episodeSlug,
    readingTime: calculateReadingTime(content),
    slug,
    content,
  };
}

export async function getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  return getFileCaseStudyBySlug(slug) || getPublishedCaseStudyImportBySlug(slug);
}

export function caseStudyFileSlugExists(slug: string): boolean {
  return fs.existsSync(path.join(CASE_STUDIES_DIR, `${slug}.mdx`));
}

export function getAllCaseStudySlugs(): string[] {
  if (!fs.existsSync(CASE_STUDIES_DIR)) return [];

  return fs
    .readdirSync(CASE_STUDIES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
