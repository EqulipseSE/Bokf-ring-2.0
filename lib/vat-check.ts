import { defaultVatCode } from "@/lib/vat-codes";

/** En öres skillnad räknas som avrundning. */
const ROUNDING_ORE = 1;

const RATE_BY_CODE: Readonly<Record<string, { side: "U" | "I"; rate: number }>> = {
  U25: { side: "U", rate: 25 },
  U12: { side: "U", rate: 12 },
  U6: { side: "U", rate: 6 },
  I25: { side: "I", rate: 25 },
  I12: { side: "I", rate: 12 },
  I6: { side: "I", rate: 6 },
};

export type VatCheckLine = {
  accountNumber: string;
  accountName: string;
  vatCode: string | null;
  debitOre: number;
  creditOre: number;
};

/**
 * Jämför bokförd moms på 26xx med underlaget på övriga konton som har samma momskod.
 * null = inget att kontrollera. Hindrar inte att verifikationen sparas.
 */
function showsVatHint(accountNumber: string): boolean {
  return (
    accountNumber.startsWith("261") ||
    accountNumber.startsWith("262") ||
    accountNumber.startsWith("263") ||
    accountNumber.startsWith("3")
  );
}

export function voucherVatHint(lines: VatCheckLine[]): "ok" | "ej" | null {
  const relevant = lines.some(
    (line) =>
      (line.debitOre !== 0 || line.creditOre !== 0) && showsVatHint(line.accountNumber)
  );
  if (!relevant) return null;

  const buckets = new Map<string, { base: number; vat: number; rate: number }>();

  for (const line of lines) {
    if (line.debitOre === 0 && line.creditOre === 0) continue;
    const code =
      line.vatCode?.trim() ||
      defaultVatCode(line.accountNumber, line.accountName) ||
      "";
    const spec = RATE_BY_CODE[code];
    if (!spec) continue;

    const bucket = buckets.get(code) ?? { base: 0, vat: 0, rate: spec.rate };
    const signed = spec.side === "U" ? line.creditOre - line.debitOre : line.debitOre - line.creditOre;
    if (line.accountNumber.startsWith("26")) bucket.vat += signed;
    else bucket.base += signed;
    buckets.set(code, bucket);
  }

  if (buckets.size === 0) return null;

  for (const bucket of buckets.values()) {
    const expected = Math.round((bucket.base * bucket.rate) / 100);
    if (Math.abs(expected - bucket.vat) > ROUNDING_ORE) return "ej";
  }
  return "ok";
}

export type OutgoingVatReview = {
  turnoverOre: number;
  expectedOre: number;
  reportedOre: number;
  mismatch: boolean;
};

/** Utgående moms mot intäktskonton. Omsättning är netto på 3-konton. */
export function outgoingVatReview(lines: VatCheckLine[]): OutgoingVatReview {
  let turnoverOre = 0;
  const buckets = new Map<string, { base: number; vat: number; rate: number }>();

  for (const line of lines) {
    if (line.debitOre === 0 && line.creditOre === 0) continue;
    if (line.accountNumber.startsWith("3")) {
      turnoverOre += line.creditOre - line.debitOre;
    }
    const code =
      line.vatCode?.trim() ||
      defaultVatCode(line.accountNumber, line.accountName) ||
      "";
    const spec = RATE_BY_CODE[code];
    if (!spec || spec.side !== "U") continue;
    const bucket = buckets.get(code) ?? { base: 0, vat: 0, rate: spec.rate };
    const signed = line.creditOre - line.debitOre;
    if (line.accountNumber.startsWith("26")) bucket.vat += signed;
    else bucket.base += signed;
    buckets.set(code, bucket);
  }

  let expectedOre = 0;
  let reportedOre = 0;
  let mismatch = false;
  for (const bucket of buckets.values()) {
    const expected = Math.round((bucket.base * bucket.rate) / 100);
    expectedOre += expected;
    reportedOre += bucket.vat;
    if (Math.abs(expected - bucket.vat) > ROUNDING_ORE) mismatch = true;
  }
  return { turnoverOre, expectedOre, reportedOre, mismatch };
}
