CREATE TABLE "company_period_locks" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"locked_through" date NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_period_locks" ADD CONSTRAINT "company_period_locks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_period_locks" ADD CONSTRAINT "company_period_locks_locked_by_users_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION omnio_prevent_locked_period_voucher()
RETURNS trigger AS $$
DECLARE
  lock_date date;
BEGIN
  SELECT locked_through INTO lock_date
  FROM company_period_locks
  WHERE company_id = NEW.company_id;
  IF lock_date IS NOT NULL AND NEW.date <= lock_date THEN
    RAISE EXCEPTION 'PERIOD_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    SELECT locked_through INTO lock_date
    FROM company_period_locks
    WHERE company_id = OLD.company_id;
    IF lock_date IS NOT NULL AND OLD.date <= lock_date THEN
      RAISE EXCEPTION 'PERIOD_LOCKED' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER vouchers_period_lock
BEFORE INSERT OR UPDATE ON vouchers
FOR EACH ROW EXECUTE FUNCTION omnio_prevent_locked_period_voucher();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION omnio_prevent_locked_period_attachment()
RETURNS trigger AS $$
DECLARE
  lock_date date;
  voucher_date date;
  voucher_company uuid;
BEGIN
  SELECT v.date, v.company_id INTO voucher_date, voucher_company
  FROM vouchers v
  WHERE v.id = NEW.voucher_id;
  SELECT locked_through INTO lock_date
  FROM company_period_locks
  WHERE company_id = voucher_company;
  IF lock_date IS NOT NULL AND voucher_date <= lock_date THEN
    RAISE EXCEPTION 'PERIOD_LOCKED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER voucher_attachments_period_lock
BEFORE INSERT OR UPDATE ON voucher_attachments
FOR EACH ROW EXECUTE FUNCTION omnio_prevent_locked_period_attachment();