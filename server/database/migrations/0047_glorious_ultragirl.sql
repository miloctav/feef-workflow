CREATE TABLE "trusted_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"label" varchar(255),
	"expires_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_trusted_devices_account_id" ON "trusted_devices" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_trusted_devices_token_hash" ON "trusted_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_trusted_devices_expires_at" ON "trusted_devices" USING btree ("expires_at");