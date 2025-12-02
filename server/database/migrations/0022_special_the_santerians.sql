ALTER TABLE "entities" ADD COLUMN "address" varchar(255);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "address_complement" varchar(255);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "postal_code" varchar(10);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "phone_number" varchar(20);