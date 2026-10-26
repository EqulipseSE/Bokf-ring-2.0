import {
  MONTH_NAMES,
  lastDayOfMonth,
  parseIsoDateParts,
} from "@/lib/vat-declaration";

export type MonthLockStatus = "open" | "locked" | "partial";

export type MonthLockRow = {
  year: number;
  month: number;
  name: string;
  from: string;
  to: string;
  status: MonthLockStatus;
  statusLabel: string;
};

export type NextLockTarget = {
  year: number;
  month: number;
  through: string;
};

export type PeriodLockPageData = {
  year: number;
  years: number[];
  lockedThrough: string | null;
  lockedAt: Date | null;
  next: NextLockTarget;
  months: (MonthLockRow & { voucherCount: number })[];
  lockable: { year: number; month: number; through: string; label: string }[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthStartIso(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

export function monthEndIso(year: number, month: number): string {
  return `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`;
}

export function isDateLocked(
  date: string,
  lockedThrough: string | null | undefined
): boolean {
  return Boolean(lockedThrough && date <= lockedThrough);
}

export function monthLockStatus(
  year: number,
  month: number,
  lockedThrough: string | null | undefined
): MonthLockStatus {
  if (!lockedThrough) return "open";
  const from = monthStartIso(year, month);
  const to = monthEndIso(year, month);
  if (lockedThrough >= to) return "locked";
  if (lockedThrough >= from) return "partial";
  return "open";
}

export function monthStatusLabel(
  status: MonthLockStatus,
  lockedThrough: string | null | undefined,
  year: number,
  month: number
): string {
  if (status === "locked") return "Låst";
  if (status === "partial" && lockedThrough) {
    return `Delvis låst t.o.m. ${formatIsoDateSv(lockedThrough)}`;
  }
  if (status === "partial") return "Delvis låst";
  void year;
  void month;
  return "Öppen";
}

export function formatIsoDateSv(iso: string): string {
  const parts = parseIsoDateParts(iso);
  if (!parts) return iso;
  return `${parts.day} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function lockedPeriodError(lockedThrough: string): string {
  return `Perioden är låst t.o.m. ${formatIsoDateSv(lockedThrough)}.`;
}

export function assertDateOpen(
  date: string,
  lockedThrough: string | null | undefined
): { ok: true } | { ok: false; error: string } {
  if (!isDateLocked(date, lockedThrough) || !lockedThrough) {
    return { ok: true };
  }
  return { ok: false, error: lockedPeriodError(lockedThrough) };
}

/** Nästa låspunkt framifrån: resten av delvis låst månad, annars nästa månad. */
export function nextLockTarget(
  lockedThrough: string | null | undefined,
  year: number
): NextLockTarget {
  if (!lockedThrough) {
    return {
      year,
      month: 1,
      through: monthEndIso(year, 1),
    };
  }

  const parts = parseIsoDateParts(lockedThrough);
  if (!parts) {
    return { year, month: 1, through: monthEndIso(year, 1) };
  }

  const end = monthEndIso(parts.year, parts.month);
  if (lockedThrough < end) {
    return {
      year: parts.year,
      month: parts.month,
      through: end,
    };
  }

  if (parts.month === 12) {
    return {
      year: parts.year + 1,
      month: 1,
      through: monthEndIso(parts.year + 1, 1),
    };
  }
  return {
    year: parts.year,
    month: parts.month + 1,
    through: monthEndIso(parts.year, parts.month + 1),
  };
}

export function lockThroughMonth(year: number, month: number): string {
  return monthEndIso(year, month);
}

export function validateLockThrough(
  nextThrough: string,
  currentThrough: string | null | undefined
): { ok: true; through: string } | { ok: false; error: string } {
  const parts = parseIsoDateParts(nextThrough);
  if (!parts) {
    return { ok: false, error: "Ogiltigt datum." };
  }
  const through = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  if (currentThrough && through <= currentThrough) {
    return {
      ok: false,
      error: `Redan låst t.o.m. ${formatIsoDateSv(currentThrough)}. Välj ett senare datum.`,
    };
  }
  return { ok: true, through };
}

export function buildMonthRows(
  year: number,
  lockedThrough: string | null | undefined
): MonthLockRow[] {
  return MONTH_NAMES.map((name, index) => {
    const month = index + 1;
    const status = monthLockStatus(year, month, lockedThrough);
    return {
      year,
      month,
      name,
      from: monthStartIso(year, month),
      to: monthEndIso(year, month),
      status,
      statusLabel: monthStatusLabel(status, lockedThrough, year, month),
    };
  });
}

/** Månader som går att låsa till (framifrån, från nästa öppna t.o.m. årets slut). */
export function lockableMonths(
  year: number,
  lockedThrough: string | null | undefined
): { year: number; month: number; through: string; label: string }[] {
  const next = nextLockTarget(lockedThrough, year);
  const options: { year: number; month: number; through: string; label: string }[] =
    [];

  let cursorYear = next.year;
  let cursorMonth = next.month;
  while (cursorYear < year || (cursorYear === year && cursorMonth <= 12)) {
    if (cursorYear === year) {
      options.push({
        year: cursorYear,
        month: cursorMonth,
        through: monthEndIso(cursorYear, cursorMonth),
        label: formatMonthYear(cursorYear, cursorMonth),
      });
    }
    if (cursorMonth === 12) {
      cursorYear += 1;
      cursorMonth = 1;
    } else {
      cursorMonth += 1;
    }
    if (cursorYear > year) break;
  }
  return options;
}

export function parseYearQuery(
  value: string | string[] | undefined,
  fallback: number
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return fallback;
  return year;
}
