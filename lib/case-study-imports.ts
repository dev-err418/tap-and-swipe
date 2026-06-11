import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/lib/content";
import type { CaseStudy, CaseStudyMeta } from "@/lib/case-studies";

export type ImportedCaseStudyStatus = "draft" | "published";

export interface CaseStudyImportRow {
  id: string;
  source: string;
  sourceSlug: string | null;
  slug: string;
  title: string;
  description: string;
  contentMarkdown: string;
  contentHtml: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  tags: unknown;
  author: string | null;
  status: ImportedCaseStudyStatus;
  receivedStatus: string | null;
  rawPayload: unknown;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SaveCaseStudyImportInput {
  source: string;
  sourceSlug: string;
  slug: string;
  title: string;
  description: string;
  contentMarkdown: string;
  contentHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  tags: string[];
  author?: string;
  status: ImportedCaseStudyStatus;
  receivedStatus?: string;
  rawPayload: unknown;
}

export interface SaveCaseStudyImportResult {
  action: "created" | "updated";
  row: CaseStudyImportRow;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toIsoDate(value: Date | string): string {
  return toDate(value).toISOString().slice(0, 10);
}

function toTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

function publishedDate(row: CaseStudyImportRow): Date | string {
  return row.publishedAt || row.createdAt;
}

function isMissingImportTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("CaseStudyImport") && message.includes("does not exist");
}

export function caseStudyImportToMeta(row: CaseStudyImportRow): CaseStudyMeta {
  return {
    title: row.title,
    description: row.description,
    date: toIsoDate(publishedDate(row)),
    updatedDate: toIsoDate(row.updatedAt),
    image: row.imageUrl || undefined,
    imageAlt: row.imageAlt || undefined,
    author: row.author || undefined,
    tags: toTags(row.tags),
    contentFormat: "markdown",
    readingTime: calculateReadingTime(row.contentMarkdown),
    slug: row.slug,
  };
}

export function caseStudyImportToCaseStudy(row: CaseStudyImportRow): CaseStudy {
  return {
    ...caseStudyImportToMeta(row),
    content: row.contentMarkdown,
  };
}

export async function getPublishedCaseStudyImports(): Promise<CaseStudyMeta[]> {
  try {
    const rows = await prisma.$queryRaw<CaseStudyImportRow[]>`
      SELECT *
      FROM "CaseStudyImport"
      WHERE "status" = 'published'
      ORDER BY COALESCE("publishedAt", "createdAt") DESC, "createdAt" DESC
    `;
    return rows.map(caseStudyImportToMeta);
  } catch (error) {
    if (isMissingImportTableError(error)) return [];
    console.error("[case-study-imports] Failed to load imports:", error);
    return [];
  }
}

export async function getPublishedCaseStudyImportBySlug(
  slug: string
): Promise<CaseStudy | null> {
  try {
    const rows = await prisma.$queryRaw<CaseStudyImportRow[]>`
      SELECT *
      FROM "CaseStudyImport"
      WHERE "slug" = ${slug} AND "status" = 'published'
      LIMIT 1
    `;
    return rows[0] ? caseStudyImportToCaseStudy(rows[0]) : null;
  } catch (error) {
    if (isMissingImportTableError(error)) return null;
    console.error("[case-study-imports] Failed to load import:", error);
    return null;
  }
}

export async function getDraftCaseStudyImportBySlug(
  slug: string
): Promise<CaseStudy | null> {
  try {
    const rows = await prisma.$queryRaw<CaseStudyImportRow[]>`
      SELECT *
      FROM "CaseStudyImport"
      WHERE "slug" = ${slug} AND "status" = 'draft'
      LIMIT 1
    `;
    return rows[0] ? caseStudyImportToCaseStudy(rows[0]) : null;
  } catch (error) {
    if (isMissingImportTableError(error)) return null;
    console.error("[case-study-imports] Failed to load draft import:", error);
    return null;
  }
}

export async function findCaseStudyImportBySourceSlug(
  source: string,
  sourceSlug: string
): Promise<CaseStudyImportRow | null> {
  const rows = await prisma.$queryRaw<CaseStudyImportRow[]>`
    SELECT *
    FROM "CaseStudyImport"
    WHERE "source" = ${source} AND "sourceSlug" = ${sourceSlug}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function caseStudyImportSlugExists(slug: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM "CaseStudyImport" WHERE "slug" = ${slug}
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
}

export async function saveCaseStudyImport(
  input: SaveCaseStudyImportInput,
  existing?: CaseStudyImportRow | null
): Promise<SaveCaseStudyImportResult> {
  const now = new Date();
  const tagsJson = JSON.stringify(input.tags);
  const rawPayloadJson = JSON.stringify(input.rawPayload ?? {});
  const contentHtml = input.contentHtml || null;
  const imageUrl = input.imageUrl || null;
  const imageAlt = input.imageAlt || null;
  const author = input.author || null;
  const receivedStatus = input.receivedStatus || null;

  if (existing) {
    const rows = await prisma.$queryRaw<CaseStudyImportRow[]>`
      UPDATE "CaseStudyImport"
      SET
        "title" = ${input.title},
        "description" = ${input.description},
        "contentMarkdown" = ${input.contentMarkdown},
        "contentHtml" = ${contentHtml},
        "imageUrl" = ${imageUrl},
        "imageAlt" = ${imageAlt},
        "tags" = CAST(${tagsJson} AS JSONB),
        "author" = ${author},
        "status" = ${input.status},
        "receivedStatus" = ${receivedStatus},
        "rawPayload" = CAST(${rawPayloadJson} AS JSONB),
        "publishedAt" = CASE
          WHEN ${input.status} = 'published' THEN COALESCE("publishedAt", ${now})
          ELSE NULL
        END,
        "updatedAt" = ${now}
      WHERE "id" = ${existing.id}
      RETURNING *
    `;
    return { action: "updated", row: rows[0] };
  }

  const id = randomUUID();
  const publishedAt = input.status === "published" ? now : null;
  const rows = await prisma.$queryRaw<CaseStudyImportRow[]>`
    INSERT INTO "CaseStudyImport" (
      "id",
      "source",
      "sourceSlug",
      "slug",
      "title",
      "description",
      "contentMarkdown",
      "contentHtml",
      "imageUrl",
      "imageAlt",
      "tags",
      "author",
      "status",
      "receivedStatus",
      "rawPayload",
      "publishedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.source},
      ${input.sourceSlug},
      ${input.slug},
      ${input.title},
      ${input.description},
      ${input.contentMarkdown},
      ${contentHtml},
      ${imageUrl},
      ${imageAlt},
      CAST(${tagsJson} AS JSONB),
      ${author},
      ${input.status},
      ${receivedStatus},
      CAST(${rawPayloadJson} AS JSONB),
      ${publishedAt},
      ${now},
      ${now}
    )
    RETURNING *
  `;
  return { action: "created", row: rows[0] };
}
