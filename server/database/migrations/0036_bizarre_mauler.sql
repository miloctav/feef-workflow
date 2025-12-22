ALTER TABLE "audits" DROP CONSTRAINT "audits_case_submitted_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audits_case_approved_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audits_oe_opinion_transmitted_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audits_corrective_plan_validated_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audits_feef_decision_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT "audits_oe_response_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_entity_signed_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_feef_signed_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "entities" DROP CONSTRAINT "entities_documentary_review_ready_by_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "case_submitted_at";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "case_submitted_by";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "case_approved_at";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "case_approved_by";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "oe_opinion_transmitted_at";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "oe_opinion_transmitted_by";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "corrective_plan_validated_at";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "corrective_plan_validated_by";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "feef_decision_at";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "feef_decision_by";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "oe_response_at";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "oe_response_by";--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "entity_signed_at";--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "entity_signed_by";--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "feef_signed_at";--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "feef_signed_by";--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "documentary_review_ready_at";--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "documentary_review_ready_by";