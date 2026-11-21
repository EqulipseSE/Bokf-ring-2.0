CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"number" text NOT NULL,
	"name" text NOT NULL,
	"identity_number" text,
	"customer_type" text NOT NULL,
	"address" text,
	"postal_code" text,
	"city" text,
	"vat_number" text,
	"phone" text,
	"email" text,
	"note" text,
	"payment_days" integer DEFAULT 30 NOT NULL,
	"receivable_account" text,
	"invoice_delivery" text DEFAULT 'epost' NOT NULL,
	"bankgiro" text,
	"plusgiro" text,
	"discount" text,
	"agreement_name" text,
	"agreement_path" text,
	CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_company_number" ON "customers" USING btree ("company_id","number");
