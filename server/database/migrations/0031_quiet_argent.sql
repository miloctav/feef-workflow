-- Convert all OVERDUE actions to PENDING before removing the enum value
ALTER TABLE "actions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "actions" ALTER COLUMN "status" SET DEFAULT 'PENDING'::text;--> statement-breakpoint
DROP TYPE "public"."action_status";--> statement-breakpoint
CREATE TYPE "public"."action_status" AS ENUM('PENDING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "actions" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"public"."action_status";--> statement-breakpoint
ALTER TABLE "actions" ALTER COLUMN "status" SET DATA TYPE "public"."action_status" USING "status"::"public"."action_status";