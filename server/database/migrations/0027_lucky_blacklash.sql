ALTER TABLE "actions" DROP CONSTRAINT "actions_assigned_oe_id_oes_id_fk";
--> statement-breakpoint
ALTER TABLE "actions" DROP CONSTRAINT "actions_assigned_auditor_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "actions" DROP COLUMN "assigned_oe_id";--> statement-breakpoint
ALTER TABLE "actions" DROP COLUMN "assigned_auditor_id";