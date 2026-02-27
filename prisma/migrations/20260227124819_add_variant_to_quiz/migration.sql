-- AlterTable
ALTER TABLE "QuizEvent" ADD COLUMN     "variant" TEXT NOT NULL DEFAULT 'quiz';

-- AlterTable
ALTER TABLE "QuizLead" ADD COLUMN     "variant" TEXT NOT NULL DEFAULT 'quiz';
