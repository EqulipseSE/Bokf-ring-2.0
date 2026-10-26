export const EMPTY_CLIENT_CELL = "—";

export type LatestVoucherHint = {
  companyId: string;
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

export function formatClientLatestDate(
  date: string | null | undefined
): string {
  return date?.trim() ? date : EMPTY_CLIENT_CELL;
}
