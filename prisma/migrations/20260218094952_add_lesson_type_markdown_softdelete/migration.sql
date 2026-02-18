-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "markdownContent" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'video',
ALTER COLUMN "youtubeUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VideoProgress" ADD COLUMN     "uncheckedAt" TIMESTAMP(3);
