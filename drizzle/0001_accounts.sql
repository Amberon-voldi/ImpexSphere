CREATE TYPE "impexsphere"."auth_token_kind" AS ENUM('verify_email', 'reset_password');--> statement-breakpoint
CREATE TYPE "impexsphere"."supplier_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "impexsphere"."user_role" AS ENUM('buyer', 'supplier', 'admin');--> statement-breakpoint
CREATE TABLE "impexsphere"."auth_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"key" text NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "impexsphere"."auth_token_kind" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" "impexsphere"."user_role" DEFAULT 'buyer' NOT NULL,
	"supplier_id" uuid,
	"email_verified_at" timestamp with time zone,
	"disabled" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD COLUMN "admin_note" text;--> statement-breakpoint
ALTER TABLE "impexsphere"."rfqs" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "impexsphere"."suppliers" ADD COLUMN "status" "impexsphere"."supplier_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "impexsphere"."auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "impexsphere"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "impexsphere"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."users" ADD CONSTRAINT "users_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "impexsphere"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_attempts_lookup_idx" ON "impexsphere"."auth_attempts" USING btree ("action","key","created_at");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "impexsphere"."auth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "impexsphere"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "impexsphere"."sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "impexsphere"."users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_supplier_idx" ON "impexsphere"."users" USING btree ("supplier_id");--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD CONSTRAINT "enquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "impexsphere"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."enquiries" ADD CONSTRAINT "enquiries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "impexsphere"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."rfqs" ADD CONSTRAINT "rfqs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "impexsphere"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suppliers_status_idx" ON "impexsphere"."suppliers" USING btree ("status");