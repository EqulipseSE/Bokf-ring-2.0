ALTER TABLE "companies" ADD COLUMN "vat_period" text DEFAULT 'manad' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "accounting_method" text DEFAULT 'faktura' NOT NULL;