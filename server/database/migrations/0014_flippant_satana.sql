ALTER TABLE "entities" DROP CONSTRAINT "entities_case_submitted_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "entities" DROP CONSTRAINT "entities_case_approved_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "case_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "case_submitted_by" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "case_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "case_approved_by" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_case_submitted_by_accounts_id_fk" FOREIGN KEY ("case_submitted_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_case_approved_by_accounts_id_fk" FOREIGN KEY ("case_approved_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "case_submitted_at";--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "case_submitted_by";--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "case_approved_at";--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "case_approved_by";