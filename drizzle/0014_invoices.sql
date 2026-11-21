CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"number" text NOT NULL,
	"invoice_type" text NOT NULL,
	"customer_id" uuid,
	"customer_number" text,
	"customer_name" text NOT NULL,
	"reference" text,
	"invoice_date" date,
	"payment_days" integer,
	"due_date" date,
	"purchase_date" date,
	"own_comment" text,
	"invoice_comment" text,
	"prices_include_vat" boolean DEFAULT false NOT NULL,
	"freight" text,
	"invoice_fee" text,
	"currency" text DEFAULT 'SEK' NOT NULL,
	"net_ore" integer NOT NULL,
	"vat_ore" integer NOT NULL,
	"gross_ore" integer NOT NULL,
	"rounding_ore" integer NOT NULL,
	"total_ore" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_number" ON "invoices" USING btree ("company_id","number");
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"article_id" uuid,
	"article_number" text,
	"name" text,
	"unit_price" text,
	"quantity" text,
	"vat_code" text,
	"sum_ore" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_lines_invoice_line" ON "invoice_lines" USING btree ("invoice_id","line_number");
