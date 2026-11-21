ALTER TABLE "company_documents" ADD COLUMN "voucher_id" uuid;
--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;
