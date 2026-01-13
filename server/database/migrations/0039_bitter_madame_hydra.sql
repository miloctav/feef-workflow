CREATE TYPE "public"."action_plan_type" AS ENUM('NONE', 'SHORT', 'LONG');--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "audit_document_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."audit_document_type";--> statement-breakpoint
CREATE TYPE "public"."audit_document_type" AS ENUM('PLAN', 'REPORT', 'SHORT_ACTION_PLAN', 'LONG_ACTION_PLAN', 'OE_OPINION', 'ATTESTATION');--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "audit_document_type" SET DATA TYPE "public"."audit_document_type" USING "audit_document_type"::"public"."audit_document_type";--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "action_plan_type" "action_plan_type" DEFAULT 'NONE';--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "action_plan_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "needs_corrective_plan";