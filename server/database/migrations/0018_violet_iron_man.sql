ALTER TYPE "public"."audit_status" ADD VALUE 'PENDING_CASE_APPROVAL' BEFORE 'PLANNING';--> statement-breakpoint
ALTER TYPE "public"."audit_status" ADD VALUE 'PENDING_OE_CHOICE' BEFORE 'PLANNING';