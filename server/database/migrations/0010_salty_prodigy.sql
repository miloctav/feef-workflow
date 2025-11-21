ALTER TYPE "public"."audit_document_type" ADD VALUE 'OE_OPINION';--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_opinion_conditions" text;