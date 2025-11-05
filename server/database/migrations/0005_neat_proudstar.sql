CREATE TYPE "public"."signature_status" AS ENUM('DRAFT', 'PENDING_ENTITY', 'PENDING_FEEF', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."signature_type" AS ENUM('ENTITY_ONLY', 'ENTITY_AND_FEEF');--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "requires_signature" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "signature_type" "signature_type";--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "signature_status" "signature_status";--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "entity_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "entity_signed_by" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "feef_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "feef_signed_by" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_entity_signed_by_accounts_id_fk" FOREIGN KEY ("entity_signed_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_feef_signed_by_accounts_id_fk" FOREIGN KEY ("feef_signed_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;