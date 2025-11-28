ALTER TABLE "documentary_reviews" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "documents_type" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."document_category";--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('CANDIDACY', 'AUDIT', 'OTHER');--> statement-breakpoint
ALTER TABLE "documentary_reviews" ALTER COLUMN "category" SET DATA TYPE "public"."document_category" USING "category"::"public"."document_category";--> statement-breakpoint
ALTER TABLE "documents_type" ALTER COLUMN "category" SET DATA TYPE "public"."document_category" USING "category"::"public"."document_category";