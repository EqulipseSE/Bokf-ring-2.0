/** Vanliga BAS-konton som räcker för löpande bokföring i första steget. */
export const BAS_ACCOUNTS: ReadonlyArray<{
  number: string;
  name: string;
  vatCode: string | null;
}> = [
  { number: "1510", name: "Kundfordringar", vatCode: null },
  { number: "1910", name: "Kassa", vatCode: null },
  { number: "1930", name: "Företagskonto", vatCode: null },
  { number: "2010", name: "Eget kapital", vatCode: null },
  { number: "2440", name: "Leverantörsskulder", vatCode: null },
  { number: "2611", name: "Utgående moms 25 %", vatCode: "U25" },
  { number: "2641", name: "Ingående moms 25 %", vatCode: "I25" },
  { number: "3001", name: "Försäljning av varor 25 %", vatCode: "U25" },
  { number: "3011", name: "Försäljning av tjänster 25 %", vatCode: "U25" },
  { number: "4010", name: "Inköp av varor 25 %", vatCode: "I25" },
  { number: "5010", name: "Lokalhyra", vatCode: null },
  { number: "6110", name: "Kontorsmaterial", vatCode: null },
  { number: "6570", name: "Bankkostnader", vatCode: null },
  { number: "6990", name: "Övriga externa kostnader", vatCode: null },
];

export const DEFAULT_SERIES_LETTER = "A";
export const DEFAULT_SERIES_DESCRIPTION = "Verifikationsserie A";
