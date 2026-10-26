CREATE TABLE "voucher_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voucher_changes" ADD CONSTRAINT "voucher_changes_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_changes" ADD CONSTRAINT "voucher_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voucher_changes_voucher_idx" ON "voucher_changes" USING btree ("voucher_id","changed_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION omnio_protect_voucher_changes()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VOUCHER_CHANGE_IMMUTABLE' USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER voucher_changes_immutable
BEFORE UPDATE OR DELETE ON voucher_changes
FOR EACH ROW EXECUTE FUNCTION omnio_protect_voucher_changes();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION omnio_prevent_locked_period_voucher_line()
RETURNS trigger AS $$
DECLARE
  lock_date date;
  voucher_date date;
  voucher_company uuid;
  vid uuid;
BEGIN
  vid := COALESCE(NEW.voucher_id, OLD.voucher_id);
  SELECT v.date, v.company_id INTO voucher_date, voucher_company
  FROM vouchers v
  WHERE v.id = vid;
  SELECT locked_through INTO lock_date
  FROM company_period_locks
  WHERE company_id = voucher_company;
  IF lock_date IS NOT NULL AND voucher_date <= lock_date THEN
    RAISE EXCEPTION 'PERIOD_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER voucher_lines_period_lock
BEFORE INSERT OR UPDATE OR DELETE ON voucher_lines
FOR EACH ROW EXECUTE FUNCTION omnio_prevent_locked_period_voucher_line();