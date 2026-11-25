CREATE TABLE "write_offs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "code" text NOT NULL,
  "text" text NOT NULL,
  "account_number" text NOT NULL
);
ALTER TABLE "write_offs" ADD CONSTRAINT "write_offs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "write_offs_company_code_unique" ON "write_offs" ("company_id","code");
CREATE INDEX "write_offs_company_idx" ON "write_offs" ("company_id");
