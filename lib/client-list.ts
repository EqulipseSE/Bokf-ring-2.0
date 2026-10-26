import { voucherNumberLabel } from "@/lib/money";

export const EMPTY_CLIENT_CELL = "—";

export type LatestVoucherHint = {
  companyId: string;
  letter: string;
  number: number;
  date: string;
};

/** Senaste verifikation per företag: högst bokföringsdatum, sedan högst nummer. */
export function latestVoucherByCompany<T extends LatestVoucherHint>(
  rows: T[]
): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const current = latest.get(row.companyId);
    if (
      !current ||
      row.date > current.date ||
      (row.date === current.date && row.number > current.number)
    ) {
      latest.set(row.companyId, row);
    }
  }
  return latest;
}

export function formatClientLatest(
  numberLabel: string | null | undefined,
  date: string | null | undefined
): { number: string; date: string } {
  return {
    number: numberLabel?.trim() ? numberLabel : EMPTY_CLIENT_CELL,
    date: date?.trim() ? date : EMPTY_CLIENT_CELL,
  };
}

export function clientLatestVoucherLabel(
  latest: LatestVoucherHint | null | undefined,
  seriesCount: number
): string {
  if (!latest) return EMPTY_CLIENT_CELL;
  return voucherNumberLabel(latest.letter, latest.number, seriesCount);
}
