CREATE TYPE "impexsphere"."author_role" AS ENUM('buyer', 'supplier', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "impexsphere"."offer_status" AS ENUM('submitted', 'shared', 'accepted', 'declined', 'withdrawn', 'rejected');--> statement-breakpoint
CREATE TABLE "impexsphere"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_role" "impexsphere"."author_role" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"rfq_id" uuid,
	"enquiry_id" uuid,
	"supplier_id" uuid NOT NULL,
	"created_by" uuid,
	"price" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" text NOT NULL,
	"incoterm" text,
	"port" text,
	"lead_time_days" integer,
	"valid_until" timestamp with time zone,
	"notes" text,
	"status" "impexsphere"."offer_status" DEFAULT 'submitted' NOT NULL,
	"buyer_note" text,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."thread_reads" (
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone NOT NULL,
	CONSTRAINT "thread_reads_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "impexsphere"."threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid,
	"offer_id" uuid,
	"buyer_user_id" uuid,
	"supplier_id" uuid,
	"subject" text NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"desk_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "threads_enquiry_id_unique" UNIQUE("enquiry_id"),
	CONSTRAINT "threads_offer_id_unique" UNIQUE("offer_id")
);
--> statement-breakpoint
ALTER TABLE "impexsphere"."messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "impexsphere"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."messages" ADD CONSTRAINT "messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "impexsphere"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."offers" ADD CONSTRAINT "offers_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "impexsphere"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."offers" ADD CONSTRAINT "offers_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "impexsphere"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."offers" ADD CONSTRAINT "offers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "impexsphere"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."offers" ADD CONSTRAINT "offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "impexsphere"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."thread_reads" ADD CONSTRAINT "thread_reads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "impexsphere"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."thread_reads" ADD CONSTRAINT "thread_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "impexsphere"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."threads" ADD CONSTRAINT "threads_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "impexsphere"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."threads" ADD CONSTRAINT "threads_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "impexsphere"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."threads" ADD CONSTRAINT "threads_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "impexsphere"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impexsphere"."threads" ADD CONSTRAINT "threads_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "impexsphere"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "impexsphere"."messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "offers_rfq_idx" ON "impexsphere"."offers" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "offers_enquiry_idx" ON "impexsphere"."offers" USING btree ("enquiry_id");--> statement-breakpoint
CREATE INDEX "offers_supplier_idx" ON "impexsphere"."offers" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "offers_status_idx" ON "impexsphere"."offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "threads_buyer_idx" ON "impexsphere"."threads" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "threads_supplier_idx" ON "impexsphere"."threads" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "threads_last_idx" ON "impexsphere"."threads" USING btree ("last_message_at");