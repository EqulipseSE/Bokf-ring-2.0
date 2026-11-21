CREATE TABLE "voucher_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_by" uuid NOT NULL,
	"previous_date" date NOT NULL,
	"previous_text" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voucher_edits" ADD CONSTRAINT "voucher_edits_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "voucher_edits" ADD CONSTRAINT "voucher_edits_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "voucher_edits_voucher_idx" ON "voucher_edits" USING btree ("voucher_id");
--> statement-breakpoint
CREATE TABLE "voucher_edit_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edit_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"vat_code" text
);
--> statement-breakpoint
ALTER TABLE "voucher_edit_lines" ADD CONSTRAINT "voucher_edit_lines_edit_id_voucher_edits_id_fk" FOREIGN KEY ("edit_id") REFERENCES "public"."voucher_edits"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "voucher_edit_lines" ADD CONSTRAINT "voucher_edit_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "voucher_edit_lines_line" ON "voucher_edit_lines" USING btree ("edit_id","line_number");
