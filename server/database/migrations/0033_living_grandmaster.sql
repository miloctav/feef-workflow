ALTER TYPE "public"."action_type" ADD VALUE 'OE_ACCEPT_OR_REFUSE_AUDIT' BEFORE 'SET_AUDIT_DATES';--> statement-breakpoint
ALTER TYPE "public"."audit_status" ADD VALUE 'PENDING_OE_ACCEPTANCE' BEFORE 'PENDING_OE_CHOICE';--> statement-breakpoint
ALTER TYPE "public"."audit_status" ADD VALUE 'REFUSED_BY_OE';--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_response_at" timestamp;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_response_by" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_accepted" boolean;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "oe_refusal_reason" text;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "previous_audit_id" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_oe_response_by_accounts_id_fk" FOREIGN KEY ("oe_response_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_previous_audit_id_audits_id_fk" FOREIGN KEY ("previous_audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;