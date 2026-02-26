-- DropForeignKey
ALTER TABLE "FeatureSelection" DROP CONSTRAINT "FeatureSelection_userId_fkey";

-- DropTable
DROP TABLE "FeatureSelection";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "featureTag";
