ALTER TABLE "audits" ADD COLUMN "ecocert_id" integer;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_ecocert_id_unique" UNIQUE("ecocert_id");