CREATE TABLE "bank_connections" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"aspsp_name" text NOT NULL,
	"aspsp_country" text NOT NULL,
	"account_uids" text NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"last_fetched_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "bank_link_states" (
	"state" text PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_link_states" ADD CONSTRAINT "bank_link_states_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "bank_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"account_uid" text NOT NULL,
	"entry_reference" text NOT NULL,
	"booked_date" date NOT NULL,
	"amount_ore" integer NOT NULL,
	"currency" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"reference_number" text
);
--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "bank_transactions_entry" ON "bank_transactions" USING btree ("company_id","account_uid","entry_reference");
