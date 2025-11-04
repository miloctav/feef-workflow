CREATE TABLE "entity_field_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"value_string" text,
	"value_number" numeric,
	"value_boolean" boolean,
	"value_date" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_field_versions" ADD CONSTRAINT "entity_field_versions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_field_versions" ADD CONSTRAINT "entity_field_versions_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_entity_field_versions_lookup" ON "entity_field_versions" ("entity_id", "field_key", "created_at" DESC);