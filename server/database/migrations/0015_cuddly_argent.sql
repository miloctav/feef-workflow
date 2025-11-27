CREATE TABLE "audit_notation" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"criterion_key" integer NOT NULL,
	"theme_key" integer NOT NULL,
	"description" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "audits" RENAME COLUMN "score" TO "global_score";--> statement-breakpoint
ALTER TABLE "audit_notation" ADD CONSTRAINT "audit_notation_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;