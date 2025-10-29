CREATE TYPE "public"."account_entity_role" AS ENUM('SIGNATORY', 'PROCESS_MANAGER');--> statement-breakpoint
CREATE TYPE "public"."audit_type" AS ENUM('INITIAL', 'RENEWAL', 'MONITORING');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('LEGAL', 'FINANCIAL', 'TECHNICAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."entity_mode" AS ENUM('MASTER', 'FOLLOWER');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('COMPANY', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."oe_role" AS ENUM('ADMIN', 'ACCOUNT_MANAGER');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('FEEF', 'OE', 'AUDITOR', 'ENTITY');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstname" varchar(255) NOT NULL,
	"lastname" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"role" "role" NOT NULL,
	"oe_id" integer,
	"oe_role" "oe_role",
	"current_entity_id" integer,
	"password_changed_at" timestamp,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "accounts_to_entities" (
	"account_id" integer NOT NULL,
	"entity_id" integer NOT NULL,
	"role" "account_entity_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_to_entities_account_id_entity_id_pk" PRIMARY KEY("account_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "auditors_to_oe" (
	"auditor_id" integer NOT NULL,
	"oe_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"oe_id" integer,
	"auditor_id" integer,
	"type" "audit_type" NOT NULL,
	"planned_date" date,
	"actual_date" date,
	"score" integer,
	"labeling_opinion" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentary_review_id" integer NOT NULL,
	"upload_at" timestamp DEFAULT now() NOT NULL,
	"s3_key" varchar(512),
	"mime_type" varchar(255),
	"upload_by" integer NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "documentary_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"document_type_id" integer,
	"title" varchar(255) NOT NULL,
	"description" varchar(1024),
	"category" "document_category" NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "documents_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" varchar(1024),
	"category" "document_category" NOT NULL,
	"auto_ask" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"siren" varchar(9),
	"siret" varchar(14),
	"type" "entity_type" NOT NULL,
	"mode" "entity_mode" NOT NULL,
	"parent_group_id" integer,
	"oe_id" integer,
	"account_manager_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "entities_siren_unique" UNIQUE("siren"),
	CONSTRAINT "entities_siret_unique" UNIQUE("siret")
);
--> statement-breakpoint
CREATE TABLE "oes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_oe_id_oes_id_fk" FOREIGN KEY ("oe_id") REFERENCES "public"."oes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_current_entity_id_entities_id_fk" FOREIGN KEY ("current_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_to_entities" ADD CONSTRAINT "accounts_to_entities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts_to_entities" ADD CONSTRAINT "accounts_to_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditors_to_oe" ADD CONSTRAINT "auditors_to_oe_auditor_id_accounts_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditors_to_oe" ADD CONSTRAINT "auditors_to_oe_oe_id_oes_id_fk" FOREIGN KEY ("oe_id") REFERENCES "public"."oes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_oe_id_oes_id_fk" FOREIGN KEY ("oe_id") REFERENCES "public"."oes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_auditor_id_accounts_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentary_review_id_documentary_reviews_id_fk" FOREIGN KEY ("documentary_review_id") REFERENCES "public"."documentary_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_upload_by_accounts_id_fk" FOREIGN KEY ("upload_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentary_reviews" ADD CONSTRAINT "documentary_reviews_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentary_reviews" ADD CONSTRAINT "documentary_reviews_document_type_id_documents_type_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."documents_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentary_reviews" ADD CONSTRAINT "documentary_reviews_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentary_reviews" ADD CONSTRAINT "documentary_reviews_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_type" ADD CONSTRAINT "documents_type_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents_type" ADD CONSTRAINT "documents_type_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_parent_group_id_entities_id_fk" FOREIGN KEY ("parent_group_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_oe_id_oes_id_fk" FOREIGN KEY ("oe_id") REFERENCES "public"."oes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_account_manager_id_accounts_id_fk" FOREIGN KEY ("account_manager_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oes" ADD CONSTRAINT "oes_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oes" ADD CONSTRAINT "oes_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;