CREATE TYPE "public"."audit_document_type" AS ENUM('PLAN', 'REPORT', 'CORRECTIVE_PLAN');--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "planned_start_date" date;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "planned_end_date" date;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "actual_start_date" date;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "actual_end_date" date;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "audit_id" integer;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "audit_document_type" "audit_document_type";--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "planned_date";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "actual_date";