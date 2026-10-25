CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"number" text NOT NULL,
	"name" text NOT NULL,
	"vat_code" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounts_company_number_unique" UNIQUE("company_id","number")
);
--> statement-breakpoint
CREATE TABLE "voucher_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"vat_code" text,
	"text" text,
	CONSTRAINT "voucher_lines_voucher_line_unique" UNIQUE("voucher_id","line_number"),
	CONSTRAINT "voucher_lines_debit_xor_credit" CHECK ("voucher_lines"."debit" >= 0 AND "voucher_lines"."credit" >= 0 AND (("voucher_lines"."debit" > 0 AND "voucher_lines"."credit" = 0) OR ("voucher_lines"."credit" > 0 AND "voucher_lines"."debit" = 0)))
);
--> statement-breakpoint
CREATE TABLE "voucher_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"letter" text NOT NULL,
	"description" text NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "voucher_series_company_letter_unique" UNIQUE("company_id","letter")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"date" date NOT NULL,
	"text" text NOT NULL,
	"registered_by" uuid NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'registrerad' NOT NULL,
	"corrects_voucher_id" uuid,
	CONSTRAINT "vouchers_series_number_unique" UNIQUE("series_id","number")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_series" ADD CONSTRAINT "voucher_series_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_series_id_voucher_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."voucher_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_company_idx" ON "accounts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "voucher_lines_voucher_idx" ON "voucher_lines" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "vouchers_company_registered_idx" ON "vouchers" USING btree ("company_id","registered_at");
--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_corrects_voucher_id_fk" FOREIGN KEY ("corrects_voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION check_voucher_balanced()
RETURNS trigger AS $$
DECLARE
  debit_sum bigint;
  credit_sum bigint;
BEGIN
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO debit_sum, credit_sum
    FROM voucher_lines
    WHERE voucher_id = NEW.id;
  IF debit_sum = 0 OR debit_sum <> credit_sum THEN
    RAISE EXCEPTION 'Verifikationen är inte i balans';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER voucher_must_balance
  AFTER INSERT ON vouchers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_voucher_balanced();
--> statement-breakpoint
INSERT INTO "voucher_series" ("company_id", "letter", "description", "next_number")
SELECT c.id, 'A', 'Verifikationsserie A', 1
FROM "companies" c
WHERE NOT EXISTS (
  SELECT 1 FROM "voucher_series" s WHERE s.company_id = c.id AND s.letter = 'A'
);
--> statement-breakpoint
INSERT INTO "accounts" ("company_id", "number", "name", "vat_code", "active")
SELECT c.id, v.number, v.name, NULLIF(v.vat_code, ''), true
FROM "companies" c
CROSS JOIN (
  VALUES
    ('1510', 'Kundfordringar', ''),
    ('1910', 'Kassa', ''),
    ('1930', 'Företagskonto', ''),
    ('2010', 'Eget kapital', ''),
    ('2440', 'Leverantörsskulder', ''),
    ('2611', 'Utgående moms 25 %', 'U25'),
    ('2641', 'Ingående moms 25 %', 'I25'),
    ('3001', 'Försäljning av varor 25 %', 'U25'),
    ('3011', 'Försäljning av tjänster 25 %', 'U25'),
    ('4010', 'Inköp av varor 25 %', 'I25'),
    ('5010', 'Lokalhyra', ''),
    ('6110', 'Kontorsmaterial', ''),
    ('6570', 'Bankkostnader', ''),
    ('6990', 'Övriga externa kostnader', '')
) AS v(number, name, vat_code)
WHERE NOT EXISTS (
  SELECT 1 FROM "accounts" a WHERE a.company_id = c.id AND a.number = v.number
);