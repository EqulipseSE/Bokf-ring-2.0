ALTER TABLE supplier_invoices ADD COLUMN booked_in_k boolean NOT NULL DEFAULT false;
ALTER TABLE supplier_invoices ADD COLUMN booked_in_a boolean NOT NULL DEFAULT false;
