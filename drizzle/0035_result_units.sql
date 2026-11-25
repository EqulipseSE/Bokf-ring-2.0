CREATE TABLE "result_units" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL
);
ALTER TABLE "result_units" ADD CONSTRAINT "result_units_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "result_units_company_code_unique" ON "result_units" ("company_id","code");
CREATE INDEX "result_units_company_idx" ON "result_units" ("company_id");
