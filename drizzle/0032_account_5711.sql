UPDATE accounts
SET name = 'Faktura- och påminnelseavgifter'
WHERE number = '5711';

INSERT INTO accounts (company_id, number, name, vat_code, active)
SELECT companies.id, '5711', 'Faktura- och påminnelseavgifter', NULL, true
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM accounts
  WHERE accounts.company_id = companies.id AND accounts.number = '5711'
);
