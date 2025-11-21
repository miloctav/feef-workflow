CREATE TYPE "public"."audit_status" AS ENUM('PENDING_REPORT', 'PENDING_CORRECTIVE_PLAN', 'PENDING_CORRECTIVE_PLAN_VALIDATION', 'PENDING_OE_OPINION', 'PENDING_FEEF_DECISION', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."feef_decision" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."oe_opinion" AS ENUM('FAVORABLE', 'UNFAVORABLE', 'RESERVED');--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "status" "audit_status";--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_opinion" "oe_opinion";--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_opinion_argumentaire" text;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_opinion_transmitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_opinion_transmitted_by" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "corrective_plan_validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "corrective_plan_validated_by" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "feef_decision" "feef_decision";--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "feef_decision_at" timestamp;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "feef_decision_by" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_oe_opinion_transmitted_by_accounts_id_fk" FOREIGN KEY ("oe_opinion_transmitted_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_corrective_plan_validated_by_accounts_id_fk" FOREIGN KEY ("corrective_plan_validated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_feef_decision_by_accounts_id_fk" FOREIGN KEY ("feef_decision_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;