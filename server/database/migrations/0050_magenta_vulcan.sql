ALTER TABLE "entities" ADD COLUMN "crm_id" varchar(36);--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_crm_id_unique" UNIQUE("crm_id");