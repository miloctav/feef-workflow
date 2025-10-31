CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(1024),
	"entity_id" integer NOT NULL,
	"oe_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "documentary_review_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "contract_id" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_oe_id_oes_id_fk" FOREIGN KEY ("oe_id") REFERENCES "public"."oes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;