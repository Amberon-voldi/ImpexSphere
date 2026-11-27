CREATE SCHEMA IF NOT EXISTS "impexsphere";
--> statement-breakpoint
CREATE TYPE "impexsphere"."enquiry_kind" AS ENUM('listing_quote', 'rfq_offer', 'supplier_application', 'contact');--> statement-breakpoint
CREATE TYPE "impexsphere"."enquiry_status" AS ENUM('new', 'in_progress', 'closed', 'spam');--> statement-breakpoint
CREATE TYPE "impexsphere"."listing_status" AS ENUM('draft', 'active', 'paused', 'sold_out');--> statement-breakpoint
CREATE TYPE "impexsphere"."rfq_status" AS ENUM('pending', 'open', 'closed', 'spam');--> statement-breakpoint
CREATE TYPE "impexsphere"."verification_level" AS ENUM('listed', 'verified', 'trusted');--> statement-breakpoint
CREATE TABLE "impexsphere"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"hue" text DEFAULT '#c9a55a' NOT NULL,
	"shape" text DEFAULT 'seed' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "impexsphere"."enquiry_kind" NOT NULL,
	"status" "impexsphere"."enquiry_status" DEFAULT 'new' NOT NULL,
	"listing_id" uuid,
	"rfq_id" uuid,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"commodity" text,
	"quantity" text,
	"country" text,
	"incoterm" text,
	"location" text,
	"capacity" text,
	"service" text,
	"message" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."listing_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"price_inr_kg" numeric(10, 2) NOT NULL,
	"recorded_on" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"variety" text,
	"grade" text,
	"form" text NOT NULL,
	"origin" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"price_inr_kg" numeric(10, 2) NOT NULL,
	"moq_kg" integer NOT NULL,
	"stock_kg" integer NOT NULL,
	"lead_time_days" integer DEFAULT 14 NOT NULL,
	"packing" text DEFAULT '' NOT NULL,
	"incoterms" text[] DEFAULT '{}'::text[] NOT NULL,
	"certifications" text[] DEFAULT '{}'::text[] NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lab_report" boolean DEFAULT false NOT NULL,
	"status" "impexsphere"."listing_status" DEFAULT 'active' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."rfqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"status" "impexsphere"."rfq_status" DEFAULT 'pending' NOT NULL,
	"category_id" uuid,
	"commodity" text NOT NULL,
	"specs" text,
	"quantity" text NOT NULL,
	"destination" text NOT NULL,
	"incoterm" text,
	"target_price" text,
	"delivery_by" text,
	"buyer_name" text NOT NULL,
	"buyer_company" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rfqs_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"level" "impexsphere"."verification_level" DEFAULT 'listed' NOT NULL,
	"since_year" integer,
	"rating" numeric(2, 1),
	"response_hours" integer,
	"completed_trades" integer DEFAULT 0 NOT NULL,
	"capabilities" text[] DEFAULT '{}'::text[] NOT NULL,
	"certifications" text[] DEFAULT '{}'::text[] NOT NULL,
	"contact_email" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD CONSTRAINT "enquiries_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "impexsphere"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD CONSTRAINT "enquiries_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "impexsphere"."rfqs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."listing_prices" ADD CONSTRAINT "listing_prices_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "impexsphere"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."listings" ADD CONSTRAINT "listings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "impexsphere"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "impexsphere"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."rfqs" ADD CONSTRAINT "rfqs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "impexsphere"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enquiries_kind_status_idx" ON "impexsphere"."enquiries" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "enquiries_created_at_idx" ON "impexsphere"."enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enquiries_email_idx" ON "impexsphere"."enquiries" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_prices_listing_day_idx" ON "impexsphere"."listing_prices" USING btree ("listing_id","recorded_on");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "impexsphere"."listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "impexsphere"."listings" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "listings_supplier_idx" ON "impexsphere"."listings" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "rfqs_status_idx" ON "impexsphere"."rfqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rfqs_created_at_idx" ON "impexsphere"."rfqs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "suppliers_level_idx" ON "impexsphere"."suppliers" USING btree ("level");