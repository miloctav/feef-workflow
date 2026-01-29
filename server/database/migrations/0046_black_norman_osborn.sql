CREATE TYPE "public"."monitoring_mode" AS ENUM('PHYSICAL', 'DOCUMENTARY');--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "monitoring_mode" "monitoring_mode";