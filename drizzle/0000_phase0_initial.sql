CREATE TYPE "public"."authority" AS ENUM('RBI', 'NPCI', 'MeitY', 'GoI');--> statement-breakpoint
CREATE TYPE "public"."card_network" AS ENUM('visa', 'mastercard', 'rupay', 'amex', 'diners');--> statement-breakpoint
CREATE TYPE "public"."fee_method" AS ENUM('upi', 'upi_autopay', 'credit_card_domestic', 'credit_card_intl', 'amex', 'debit_card', 'rupay_debit', 'netbanking', 'wallet', 'emi', 'international_card', 'bnpl');--> statement-breakpoint
CREATE TYPE "public"."gateway_status" AS ENUM('active', 'deprecated', 'acquired');--> statement-breakpoint
CREATE TYPE "public"."integration_platform" AS ENUM('shopify', 'woocommerce', 'wix', 'magento', 'react', 'node', 'php', 'python', 'java', 'flutter', 'react_native');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('zero_fee', 'reduced_rate', 'volume_cap');--> statement-breakpoint
CREATE TYPE "public"."regulatory_category" AS ENUM('upi_mdr', 'limits', 'tokenization', 'kyc', 'pa_license', 'other');--> statement-breakpoint
CREATE TYPE "public"."regulatory_status" AS ENUM('proposed', 'scheduled', 'deferred', 'in_effect', 'withdrawn', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('official_rate_card', 'written_quote', 'merchant_dashboard', 'support_email');--> statement-breakpoint
CREATE TABLE "features" (
	"gateway_id" bigint NOT NULL,
	"feature_key" text NOT NULL,
	"supported" boolean NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "gateways" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gateways_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"website" text NOT NULL,
	"logo_path" text,
	"rbi_pa_licensed" boolean DEFAULT false NOT NULL,
	"rbi_license_ref" text,
	"parent_company" text,
	"founded_year" integer,
	"hq_city" text,
	"status" "gateway_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"gateway_id" bigint NOT NULL,
	"platform" "integration_platform" NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"plugin_url" text,
	"sdk_url" text,
	"docs_url" text
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fees_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"plan_id" bigint NOT NULL,
	"method" "fee_method" NOT NULL,
	"card_network" "card_network",
	"rate_bp" integer,
	"flat_fee_paise" bigint,
	"min_fee_paise" bigint,
	"max_fee_paise" bigint,
	"band_min_paise" bigint,
	"band_max_paise" bigint,
	"gst_applicable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "fees_rate_sane" CHECK ("fees"."rate_bp" IS NULL OR ("fees"."rate_bp" >= 0 AND "fees"."rate_bp" <= 10000)),
	CONSTRAINT "fees_has_value" CHECK ("fees"."rate_bp" IS NOT NULL OR "fees"."flat_fee_paise" IS NOT NULL),
	CONSTRAINT "fees_band_order" CHECK ("fees"."band_max_paise" IS NULL OR "fees"."band_min_paise" IS NULL OR "fees"."band_max_paise" > "fees"."band_min_paise")
);
--> statement-breakpoint
CREATE TABLE "operational_terms" (
	"plan_id" bigint PRIMARY KEY NOT NULL,
	"settlement_cycle_days" integer,
	"instant_settlement_available" boolean DEFAULT false NOT NULL,
	"instant_settlement_fee_bp" integer,
	"chargeback_fee_paise" bigint,
	"refund_fee_paise" bigint,
	"mdr_refunded_on_refund" boolean,
	"payout_fee_paise" bigint,
	"min_payout_paise" bigint
);
--> statement-breakpoint
CREATE TABLE "pricing_plans" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pricing_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"gateway_id" bigint NOT NULL,
	"plan_name" text NOT NULL,
	"slug" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"source_url" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"verified_by" text NOT NULL,
	"notes" text,
	CONSTRAINT "plans_period_order" CHECK ("pricing_plans"."effective_to" IS NULL OR "pricing_plans"."effective_to" > "pricing_plans"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "promos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"gateway_id" bigint NOT NULL,
	"description" text NOT NULL,
	"promo_type" "promo_type" NOT NULL,
	"value_bp" integer,
	"cap_amount_paise" bigint,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"source_url" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_costs" (
	"plan_id" bigint PRIMARY KEY NOT NULL,
	"setup_fee_paise" bigint DEFAULT 0 NOT NULL,
	"annual_maintenance_paise" bigint DEFAULT 0 NOT NULL,
	"monthly_fee_paise" bigint DEFAULT 0 NOT NULL,
	"platform_fee_bp" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "regulatory_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" "regulatory_category" NOT NULL,
	"status" "regulatory_status" NOT NULL,
	"authority" "authority" NOT NULL,
	"announced_date" timestamp with time zone NOT NULL,
	"effective_date" timestamp with time zone,
	"deferred_to" timestamp with time zone,
	"summary" text NOT NULL,
	"impact_on_merchants" text,
	"primary_source_url" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"supersedes_id" bigint
);
--> statement-breakpoint
CREATE TABLE "change_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "change_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"entity_id" bigint NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_url" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "verification_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "verification_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"entity_id" bigint NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_by" text NOT NULL,
	"method" "verification_method" NOT NULL,
	"evidence_url" text
);
--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_plan_id_pricing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_terms" ADD CONSTRAINT "operational_terms_plan_id_pricing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_gateway_id_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."gateways"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_costs" ADD CONSTRAINT "recurring_costs_plan_id_pricing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "features_uq" ON "features" USING btree ("gateway_id","feature_key");--> statement-breakpoint
CREATE UNIQUE INDEX "gateways_slug_uq" ON "gateways" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "gateways_status_idx" ON "gateways" USING btree ("status") WHERE "gateways"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_uq" ON "integrations" USING btree ("gateway_id","platform");--> statement-breakpoint
CREATE INDEX "fees_plan_method_idx" ON "fees" USING btree ("plan_id","method");--> statement-breakpoint
CREATE INDEX "fees_method_idx" ON "fees" USING btree ("method","plan_id");--> statement-breakpoint
CREATE INDEX "pricing_plans_current_idx" ON "pricing_plans" USING btree ("gateway_id","is_default") WHERE "pricing_plans"."effective_to" IS NULL;--> statement-breakpoint
CREATE INDEX "pricing_plans_temporal_idx" ON "pricing_plans" USING btree ("gateway_id","effective_from" DESC NULLS LAST,"effective_to");--> statement-breakpoint
CREATE INDEX "pricing_plans_stale_idx" ON "pricing_plans" USING btree ("verified_at") WHERE "pricing_plans"."effective_to" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "plans_one_current_default" ON "pricing_plans" USING btree ("gateway_id") WHERE "pricing_plans"."effective_to" IS NULL AND "pricing_plans"."is_default";--> statement-breakpoint
CREATE INDEX "promos_active_idx" ON "promos" USING btree ("gateway_id","ends_at") WHERE "promos"."ends_at" IS NULL OR "promos"."ends_at" > now();--> statement-breakpoint
CREATE UNIQUE INDEX "regulatory_events_slug_uq" ON "regulatory_events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "regulatory_events_lookup_idx" ON "regulatory_events" USING btree ("category","status","effective_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "change_log_entity_idx" ON "change_log" USING btree ("entity_type","entity_id","changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "change_log_recent_idx" ON "change_log" USING btree ("changed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "verification_log_entity_idx" ON "verification_log" USING btree ("entity_type","entity_id","verified_at" DESC NULLS LAST);