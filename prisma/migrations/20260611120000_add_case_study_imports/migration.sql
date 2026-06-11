CREATE TABLE "CaseStudyImport" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'distribb',
  "sourceSlug" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contentMarkdown" TEXT NOT NULL,
  "contentHtml" TEXT,
  "imageUrl" TEXT,
  "imageAlt" TEXT,
  "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "author" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "receivedStatus" TEXT,
  "rawPayload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CaseStudyImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseStudyImport_slug_key" ON "CaseStudyImport"("slug");
CREATE UNIQUE INDEX "CaseStudyImport_source_sourceSlug_key" ON "CaseStudyImport"("source", "sourceSlug");
CREATE INDEX "CaseStudyImport_status_publishedAt_idx" ON "CaseStudyImport"("status", "publishedAt");
