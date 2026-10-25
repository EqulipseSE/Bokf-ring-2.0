-- Fyll tomma momskoder där default är uppenbar. Befintliga värden lämnas.
UPDATE "accounts" SET "vat_code" = 'U25'
WHERE "vat_code" IS NULL AND "number" IN ('2610','2611','2612','2613','2615','2616');
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'U12'
WHERE "vat_code" IS NULL AND "number" IN ('2620','2621','2622','2623','2625','2626');
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'U6'
WHERE "vat_code" IS NULL AND "number" IN ('2630','2631','2632','2633','2635','2636');
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'I25'
WHERE "vat_code" IS NULL AND "number" IN ('2640','2641','2642','2646','2649');
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'U25'
WHERE "vat_code" IS NULL AND "number" = '3001';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'U12'
WHERE "vat_code" IS NULL AND "number" = '3002';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'U6'
WHERE "vat_code" IS NULL AND "number" = '3003';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'MF'
WHERE "vat_code" IS NULL AND "number" = '3004';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'UOS'
WHERE "vat_code" IS NULL
  AND "number" LIKE '26%'
  AND "name" ILIKE '%utgående%'
  AND "name" ILIKE '%omvänd%';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'IOS'
WHERE "vat_code" IS NULL
  AND (
    ("number" LIKE '26%' AND "name" ILIKE '%ingående%' AND "name" ILIKE '%omvänd%')
    OR ("number" LIKE '4%' AND "name" ILIKE '%omvänd%')
  );
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'UEU'
WHERE "vat_code" IS NULL
  AND "number" LIKE '3%'
  AND ("name" ILIKE '%annat EU-land%' OR "name" ILIKE '%inom EU%');
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'IEU'
WHERE "vat_code" IS NULL
  AND "number" LIKE '4%'
  AND ("name" ILIKE '%EU-land%' OR "name" ILIKE '%annat EU-land%');
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = 'MF'
WHERE "vat_code" IS NULL AND "name" ILIKE '%momsfri%';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = CASE
  WHEN "name" ILIKE '%ingående%' THEN CASE
    WHEN "name" ~* '12 ?%' THEN 'I12'
    WHEN "name" ~* '6 ?%' THEN 'I6'
    ELSE 'I25'
  END
  WHEN "name" ILIKE '%utgående%' THEN CASE
    WHEN "name" ~* '25 ?%' THEN 'U25'
    WHEN "name" ~* '12 ?%' THEN 'U12'
    WHEN "name" ~* '6 ?%' THEN 'U6'
  END
END
WHERE "vat_code" IS NULL
  AND "number" LIKE '26%'
  AND "name" NOT ILIKE '%redovisningskonto%'
  AND "name" NOT ILIKE '%punktskatt%';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = CASE
  WHEN "name" ~* '25 ?%' THEN 'U25'
  WHEN "name" ~* '12 ?%' THEN 'U12'
  WHEN "name" ~* '6 ?%' THEN 'U6'
END
WHERE "vat_code" IS NULL
  AND "number" LIKE '3%'
  AND "name" ILIKE '%försäljning%';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = CASE
  WHEN "name" ~* '25 ?%' THEN 'I25'
  WHEN "name" ~* '12 ?%' THEN 'I12'
  WHEN "name" ~* '6 ?%' THEN 'I6'
END
WHERE "vat_code" IS NULL
  AND "number" LIKE '4%'
  AND "name" ILIKE '%inköp%';
--> statement-breakpoint
UPDATE "accounts" SET "vat_code" = CASE
  WHEN "name" ~* '25 ?%' THEN 'I25'
  WHEN "name" ~* '12 ?%' THEN 'I12'
  WHEN "name" ~* '6 ?%' THEN 'I6'
  WHEN "name" ILIKE '%ingående%' THEN 'I25'
END
WHERE "vat_code" IS NULL
  AND "number" ~ '^[5-8]'
  AND "name" ILIKE '%moms%';
