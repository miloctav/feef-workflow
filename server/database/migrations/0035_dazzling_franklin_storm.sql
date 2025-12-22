CREATE TYPE "public"."event_category" AS ENUM('AUDIT', 'ENTITY', 'CONTRACT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('AUDIT_CASE_SUBMITTED', 'AUDIT_CASE_APPROVED', 'AUDIT_OE_ASSIGNED', 'AUDIT_OE_ACCEPTED', 'AUDIT_OE_REFUSED', 'AUDIT_DATES_SET', 'AUDIT_PLAN_UPLOADED', 'AUDIT_REPORT_UPLOADED', 'AUDIT_CORRECTIVE_PLAN_UPLOADED', 'AUDIT_CORRECTIVE_PLAN_VALIDATED', 'AUDIT_OE_OPINION_TRANSMITTED', 'AUDIT_FEEF_DECISION_ACCEPTED', 'AUDIT_FEEF_DECISION_REJECTED', 'AUDIT_ATTESTATION_GENERATED', 'AUDIT_STATUS_CHANGED', 'ENTITY_DOCUMENTARY_REVIEW_READY', 'ENTITY_OE_ASSIGNED', 'CONTRACT_ENTITY_SIGNED', 'CONTRACT_FEEF_SIGNED');--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "event_type" NOT NULL,
	"category" "event_category" NOT NULL,
	"audit_id" integer,
	"entity_id" integer,
	"contract_id" integer,
	"performed_by" integer NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_performed_by_accounts_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_events_audit_id" ON "events" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "idx_events_entity_id" ON "events" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "idx_events_type" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_events_category_date" ON "events" USING btree ("category","performed_at");--> statement-breakpoint
CREATE INDEX "idx_events_performed_by" ON "events" USING btree ("performed_by");