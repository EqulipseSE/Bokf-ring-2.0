ALTER TABLE supplier_invoices ADD COLUMN levfaktura_number integer;
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY company_id ORDER BY invoice_date, invoice_number) AS n
  FROM supplier_invoices
)
UPDATE supplier_invoices AS invoice
SET levfaktura_number = numbered.n
FROM numbered
WHERE invoice.id = numbered.id;
ALTER TABLE supplier_invoices ALTER COLUMN levfaktura_number SET NOT NULL;
CREATE UNIQUE INDEX supplier_invoices_levfaktura_number ON supplier_invoices (company_id, levfaktura_number);
