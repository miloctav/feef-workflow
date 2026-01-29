CREATE TYPE "public"."audit_phase" AS ENUM('PHASE_1', 'PHASE_2');--> statement-breakpoint
ALTER TYPE "public"."audit_status" ADD VALUE 'REFUSED_PLAN';--> statement-breakpoint
ALTER TYPE "public"."audit_status" ADD VALUE 'PENDING_COMPLEMENTARY_AUDIT';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'AUDIT_CORRECTIVE_PLAN_REFUSED' BEFORE 'AUDIT_OE_OPINION_TRANSMITTED';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'AUDIT_COMPLEMENTARY_REQUESTED' BEFORE 'AUDIT_OE_OPINION_TRANSMITTED';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'AUDIT_COMPLEMENTARY_DATES_SET' BEFORE 'AUDIT_OE_OPINION_TRANSMITTED';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'AUDIT_COMPLEMENTARY_REPORT_UPLOADED' BEFORE 'AUDIT_OE_OPINION_TRANSMITTED';--> statement-breakpoint
ALTER TABLE "actions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."action_type";--> statement-breakpoint
CREATE TYPE "public"."action_type" AS ENUM('FEEF_VALIDATE_CASE_SUBMISSION', 'FEEF_VALIDATE_LABELING_DECISION', 'FEEF_SIGN_CONTRACT', 'ENTITY_SUBMIT_CASE', 'ENTITY_MARK_DOCUMENTARY_REVIEW_READY', 'ENTITY_CHOOSE_OE', 'ENTITY_UPLOAD_REQUESTED_DOCUMENTS', 'ENTITY_UPDATE_CASE_INFORMATION', 'ENTITY_SIGN_FEEF_CONTRACT', 'ENTITY_UPLOAD_CORRECTIVE_PLAN', 'OE_ACCEPT_OR_REFUSE_AUDIT', 'SET_AUDIT_DATES', 'UPLOAD_AUDIT_PLAN', 'UPLOAD_AUDIT_REPORT', 'VALIDATE_CORRECTIVE_PLAN', 'UPLOAD_LABELING_OPINION', 'SET_COMPLEMENTARY_AUDIT_DATES', 'UPLOAD_COMPLEMENTARY_REPORT');--> statement-breakpoint
ALTER TABLE "actions" ALTER COLUMN "type" SET DATA TYPE "public"."action_type" USING "type"::"public"."action_type";--> statement-breakpoint
ALTER TABLE "audit_notation" ADD COLUMN "phase" "audit_phase" DEFAULT 'PHASE_1' NOT NULL;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "has_complementary_audit" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "complementary_start_date" date;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "complementary_end_date" date;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "complementary_global_score" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "plan_refusal_reason" text;