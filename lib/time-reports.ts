export const TIDSRAPPORTER_PATH = "/tidsrapporter";

export const ACCOUNT_KINDS = ["huvudkonto", "anstalld"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/**
 * Tills BF-17 (huvudkonto/anställd) finns bara huvudkonto i praktiken:
 * inloggad användare ser byråns alla timmar. Anställd-grenen är redo
 * i datamodellen och filtreras på userId.
 */
export function accountKindForUser(user: { id: string }): AccountKind {
  void user.id;
  return "huvudkonto";
}

export type TimeReportScope =
  | { kind: "huvudkonto" }
  | { kind: "anstalld"; userId: string };

export function timeReportScope(
  accountKind: AccountKind,
  userId: string
): TimeReportScope {
  return accountKind === "anstalld"
    ? { kind: "anstalld", userId }
    : { kind: "huvudkonto" };
}

export function isTimeEntryVisible(
  entryUserId: string,
  scope: TimeReportScope
): boolean {
  return scope.kind === "huvudkonto" || entryUserId === scope.userId;
}

export function timeReportCaption(scope: TimeReportScope): string {
  return scope.kind === "huvudkonto"
    ? "Byråns alla timmar."
    : "Dina timmar.";
}

export const MONTH_LABELS_SV = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
] as const;

export type TimeEntryHint = {
  id?: string;
  companyId: string;
  companyName: string;
  userId: string;
  workDate: string;
  startTime?: string;
  summary?: string;
  minutes: number;
};

export type TimeReportEntry = {
  id: string;
  workDate: string;
  dateLabel: string;
  timeLabel: string;
  summary: string;
  minutes: number;
  hoursLabel: string;
};

export type TimeReportRow = {
  companyId: string;
  companyName: string;
  yearMonth: string;
  monthLabel: string;
  minutes: number;
  hoursLabel: string;
  entries: TimeReportEntry[];
};

const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

export function yearMonthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthLabelSv(yearMonth: string): string {
  const month = Number(yearMonth.slice(5, 7));
  const year = yearMonth.slice(0, 4);
  const name = MONTH_LABELS_SV[month - 1];
  return name ? `${name} ${year}` : yearMonth;
}

/** Heltal utan decimaler, annars svenskt kommatecken. */
export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return String(hours);
  return hours.toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Visar klockslag som HH:MM. */
export function formatClock(value: string | null | undefined): string {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "08:00";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toEntry(entry: TimeEntryHint): TimeReportEntry {
  return {
    id:
      entry.id ??
      `${entry.companyId}:${entry.workDate}:${entry.userId}:${entry.startTime ?? ""}`,
    workDate: entry.workDate,
    dateLabel: entry.workDate,
    timeLabel: formatClock(entry.startTime),
    summary: entry.summary?.trim() || "Arbetad tid",
    minutes: entry.minutes,
    hoursLabel: formatHours(entry.minutes),
  };
}

export function aggregateTimeReportRows(
  entries: readonly TimeEntryHint[],
  scope: TimeReportScope
): TimeReportRow[] {
  const totals = new Map<
    string,
    {
      companyId: string;
      companyName: string;
      yearMonth: string;
      minutes: number;
      entries: TimeEntryHint[];
    }
  >();

  for (const entry of entries) {
    if (!isTimeEntryVisible(entry.userId, scope)) continue;
    const yearMonth = yearMonthFromDate(entry.workDate);
    if (!YEAR_MONTH_RE.test(yearMonth)) continue;
    const key = `${entry.companyId}:${yearMonth}`;
    const current = totals.get(key);
    if (current) {
      current.minutes += entry.minutes;
      current.entries.push(entry);
    } else {
      totals.set(key, {
        companyId: entry.companyId,
        companyName: entry.companyName,
        yearMonth,
        minutes: entry.minutes,
        entries: [entry],
      });
    }
  }

  return [...totals.values()]
    .sort((a, b) => {
      const monthCmp = b.yearMonth.localeCompare(a.yearMonth);
      if (monthCmp !== 0) return monthCmp;
      return a.companyName.localeCompare(b.companyName, "sv");
    })
    .map((row) => ({
      companyId: row.companyId,
      companyName: row.companyName,
      yearMonth: row.yearMonth,
      monthLabel: monthLabelSv(row.yearMonth),
      minutes: row.minutes,
      hoursLabel: formatHours(row.minutes),
      entries: row.entries
        .slice()
        .sort((a, b) => {
          const dateCmp = a.workDate.localeCompare(b.workDate);
          if (dateCmp !== 0) return dateCmp;
          return formatClock(a.startTime).localeCompare(formatClock(b.startTime));
        })
        .map(toEntry),
    }));
}
