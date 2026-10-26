export const EMPTY_CLIENT_CELL = "—";

export type ClientListRow = {
  id: string;
  name: string;
  orgNumber: string;
  accountingMethod: string;
  latestVoucherDate: string;
  status: string;
};

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

export const CLIENT_STATUS_PLACEHOLDER = "placeholder";

export type ClientStatusSort = "asc" | "desc";

export function sortClientsByStatus<
  T extends { name: string; status: string },
>(rows: T[], direction: ClientStatusSort): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const statusCmp = a.status.localeCompare(b.status, "sv");
    if (statusCmp !== 0) return statusCmp * sign;
    return a.name.localeCompare(b.name, "sv") * sign;
  });
}
