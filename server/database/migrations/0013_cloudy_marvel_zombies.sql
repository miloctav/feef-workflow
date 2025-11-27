ALTER TABLE "audits" ADD COLUMN "planned_date" date;--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "planned_start_date";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "planned_end_date";