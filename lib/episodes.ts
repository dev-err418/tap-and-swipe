import fs from "fs";
import path from "path";
import matter from "gray-matter";

const EPISODES_DIR = path.join(process.cwd(), "content", "episodes");

export interface EpisodeMeta {
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  image?: string;
  imageAlt?: string;
  guest?: string;
  tags?: string[];
  readingTime: number;
  slug: string;
}

export interface Episode extends EpisodeMeta {
  content: string;
}

export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function getAllEpisodes(): EpisodeMeta[] {
  if (!fs.existsSync(EPISODES_DIR)) return [];

  const files = fs.readdirSync(EPISODES_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(EPISODES_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      return {
        title: data.title,
        description: data.description,
        date: data.date,
        updatedDate: data.updatedDate,
        image: data.image,
        imageAlt: data.imageAlt,
        guest: data.guest,
        tags: data.tags,
        readingTime: calculateReadingTime(content),
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
    updatedDate: data.updatedDate,
    image: data.image,
    imageAlt: data.imageAlt,
    guest: data.guest,
    tags: data.tags,
    readingTime: calculateReadingTime(content),
    slug,
    content,
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(EPISODES_DIR)) return [];

  return fs
    .readdirSync(EPISODES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}
