ALTER TABLE "document_versions" ADD COLUMN "asked_by" integer;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "asked_at" timestamp;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_asked_by_accounts_id_fk" FOREIGN KEY ("asked_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;