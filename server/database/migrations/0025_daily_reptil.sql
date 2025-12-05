CREATE TYPE "public"."action_status" AS ENUM('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."action_type" AS ENUM('FEEF_VALIDATE_CASE_SUBMISSION', 'FEEF_VALIDATE_LABELING_DECISION', 'ENTITY_SUBMIT_CASE', 'ENTITY_MARK_DOCUMENTARY_REVIEW_READY', 'ENTITY_CHOOSE_OE', 'ENTITY_UPLOAD_REQUESTED_DOCUMENTS', 'ENTITY_UPDATE_CASE_INFORMATION', 'ENTITY_SIGN_FEEF_CONTRACT', 'ENTITY_UPLOAD_CORRECTIVE_PLAN', 'OE_ACCEPT_AUDIT', 'OE_UPLOAD_AUDIT_PLAN', 'OE_UPLOAD_AUDIT_REPORT', 'OE_VALIDATE_CORRECTIVE_PLAN', 'OE_UPLOAD_LABELING_OPINION', 'AUDITOR_UPLOAD_AUDIT_PLAN', 'AUDITOR_UPLOAD_AUDIT_REPORT', 'AUDITOR_VALIDATE_CORRECTIVE_PLAN', 'AUDITOR_UPLOAD_LABELING_OPINION');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "action_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"audit_id" integer,
	"assigned_role" "role" NOT NULL,
	"assigned_oe_id" integer,
	"assigned_auditor_id" integer,
	"status" "action_status" DEFAULT 'PENDING' NOT NULL,
	"duration_days" integer NOT NULL,
	"deadline" timestamp NOT NULL,
	"completed_at" timestamp,
	"completed_by" integer,
	"metadata" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_assigned_oe_id_oes_id_fk" FOREIGN KEY ("assigned_oe_id") REFERENCES "public"."oes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_assigned_auditor_id_accounts_id_fk" FOREIGN KEY ("assigned_auditor_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_completed_by_accounts_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;