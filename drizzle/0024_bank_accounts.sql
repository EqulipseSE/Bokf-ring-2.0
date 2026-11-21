CREATE TABLE "bank_accounts" (
	"company_id" uuid NOT NULL,
	"account_uid" text NOT NULL,
	"account_number" text NOT NULL,
	CONSTRAINT "bank_accounts_company_id_account_uid_pk" PRIMARY KEY("company_id","account_uid")
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
