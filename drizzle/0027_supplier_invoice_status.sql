ALTER TABLE supplier_invoices ADD COLUMN status text NOT NULL DEFAULT 'obetald';
ALTER TABLE supplier_invoices ADD COLUMN document_id uuid REFERENCES company_documents (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX supplier_invoices_document_unique ON supplier_invoices (document_id);
