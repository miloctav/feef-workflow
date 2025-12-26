ALTER TABLE "accounts" ADD COLUMN "pending_email" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "email_change_requested_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_pending_email" ON "accounts" ("pending_email") WHERE "pending_email" IS NOT NULL AND "deleted_at" IS NULL;