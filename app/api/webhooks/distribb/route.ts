import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  caseStudyImportSlugExists,
  findCaseStudyImportBySourceSlug,
  saveCaseStudyImport,
  type ImportedCaseStudyStatus,
} from "@/lib/case-study-imports";
import { caseStudyFileSlugExists } from "@/lib/case-studies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOURCE = "distribb";

const distribbArticleSchema = z
  .object({
    title: z.string().min(1),
    slug: z.string().optional(),
    content_html: z.string().optional(),
    content_markdown: z.string().optional(),
    meta_description: z.string().optional(),
    image_url: z.string().optional(),
    alt_text: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

const distribbPayloadSchema = z.object({
  data: z.object({
    articles: z.array(distribbArticleSchema).min(1),
  }),
});

type DistribbArticle = z.infer<typeof distribbArticleSchema>;

function hash(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(hash(a), hash(b));
}

function extractTokens(request: NextRequest): string[] {
  const tokens: string[] = [];
  const authorization = request.headers.get("authorization");
  if (authorization) {
    tokens.push(authorization.replace(/^Bearer\s+/i, "").trim());
  }
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) tokens.push(apiKey.trim());
  const makeApiKey = request.headers.get("x-make-apikey");
  if (makeApiKey) tokens.push(makeApiKey.trim());
  return tokens.filter(Boolean);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.DISTRIBB_WEBHOOK_TOKEN;
  if (!expected) return false;
  return extractTokens(request).some((token) => safeEqual(token, expected));
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || `article-${Date.now()}`;
}

function normalizeStatus(status: string | undefined): ImportedCaseStudyStatus {
  return status?.toLowerCase() === "published" ? "published" : "draft";
}

function normalizeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function sanitizeMarkdown(markdown: string): string {
  return markdown
    .replace(/^\s*import\s+.*$/gm, "")
    .replace(/^\s*export\s+.*$/gm, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|{[^}]*})/gi, "")
    .trim();
}

function descriptionFromMarkdown(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trim()}...`;
}

async function nextAvailableSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (
    caseStudyFileSlugExists(candidate) ||
    (await caseStudyImportSlugExists(candidate))
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isDistribbTestArticle(article: DistribbArticle): boolean {
  return article.title === "Article title" && slugify(article.slug || "") === "article-slug";
}

export async function POST(request: NextRequest) {
  if (!process.env.DISTRIBB_WEBHOOK_TOKEN) {
    return NextResponse.json(
      { error: "DISTRIBB_WEBHOOK_TOKEN is not configured" },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = distribbPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Distribb payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const saved: Array<{
    action: "created" | "updated";
    slug: string;
    status: ImportedCaseStudyStatus;
    url: string;
  }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];

  for (const article of parsed.data.data.articles) {
    const sourceSlug = slugify(article.slug || article.title);

    if (isDistribbTestArticle(article)) {
      skipped.push({ slug: sourceSlug, reason: "distribb_test_payload" });
      continue;
    }

    const contentMarkdown = sanitizeMarkdown(article.content_markdown || "");
    if (!contentMarkdown) {
      return NextResponse.json(
        { error: `Article "${article.title}" is missing content_markdown` },
        { status: 400 }
      );
    }

    const existing = await findCaseStudyImportBySourceSlug(SOURCE, sourceSlug);
    const slug = existing?.slug || (await nextAvailableSlug(sourceSlug));
    const status = normalizeStatus(article.status);
    const description =
      article.meta_description?.trim() ||
      descriptionFromMarkdown(contentMarkdown) ||
      article.title;

    const result = await saveCaseStudyImport(
      {
        source: SOURCE,
        sourceSlug,
        slug,
        title: article.title.trim(),
        description,
        contentMarkdown,
        contentHtml: article.content_html?.trim(),
        imageUrl: normalizeUrl(article.image_url),
        imageAlt: article.alt_text?.trim() || article.title.trim(),
        tags: [...new Set((article.tags || []).map((tag) => tag.trim()).filter(Boolean))],
        author: article.author?.trim(),
        status,
        receivedStatus: article.status,
        rawPayload: article,
      },
      existing
    );

    const publicPath =
      result.row.status === "published"
        ? `/case-studies/${result.row.slug}`
        : `/drafts/${result.row.slug}`;

    saved.push({
      action: result.action,
      slug: result.row.slug,
      status: result.row.status,
      url: publicPath,
    });
  }

  return NextResponse.json({
    ok: true,
    received: parsed.data.data.articles.length,
    saved,
    skipped,
  });
}
