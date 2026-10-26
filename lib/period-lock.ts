import type { CompanyVatPeriod } from "@/lib/company-settings";
import { VAT_PERIOD_LABELS } from "@/lib/company-settings";
import {
  MONTH_NAMES,
  lastDayOfMonth,
  parseIsoDateParts,
} from "@/lib/vat-declaration";

export type MonthLockStatus = "open" | "locked" | "partial";

export type LockPeriodRow = {
  year: number;
  number: number;
  label: string;
  from: string;
  to: string;
  status: MonthLockStatus;
  statusLabel: string;
};

export type NextLockTarget = {
  year: number;
  number: number;
  through: string;
  label: string;
};

export type PeriodLockPageData = {
  kind: CompanyVatPeriod;
  kindLabel: string;
  year: number;
  years: number[];
  lockedThrough: string | null;
  lockedAt: Date | null;
  next: NextLockTarget;
  periods: (LockPeriodRow & { voucherCount: number })[];
  lockable: NextLockTarget[];
};

const QUARTERS = [
  { number: 1, start: 1, end: 3, short: "jan–mar" },
  { number: 2, start: 4, end: 6, short: "apr–jun" },
  { number: 3, start: 7, end: 9, short: "jul–sep" },
  { number: 4, start: 10, end: 12, short: "okt–dec" },
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthStartIso(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

export function monthEndIso(year: number, month: number): string {
  return `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`;
}

export function periodCount(kind: CompanyVatPeriod): number {
  if (kind === "kvartal") return 4;
  if (kind === "ar") return 1;
  return 12;
}

export function periodStartIso(
  kind: CompanyVatPeriod,
  year: number,
  number: number
): string {
  if (kind === "ar") return `${year}-01-01`;
  if (kind === "kvartal") {
    const quarter = QUARTERS[clampPeriod(kind, number) - 1];
    return monthStartIso(year, quarter.start);
  }
  return monthStartIso(year, clampPeriod(kind, number));
}

export function periodEndIso(
  kind: CompanyVatPeriod,
  year: number,
  number: number
): string {
  if (kind === "ar") return `${year}-12-31`;
  if (kind === "kvartal") {
    const quarter = QUARTERS[clampPeriod(kind, number) - 1];
    return monthEndIso(year, quarter.end);
  }
  return monthEndIso(year, clampPeriod(kind, number));
}

export function periodLabel(
  kind: CompanyVatPeriod,
  year: number,
  number: number
): string {
  const n = clampPeriod(kind, number);
  if (kind === "ar") return `helår ${year}`;
  if (kind === "kvartal") {
    const quarter = QUARTERS[n - 1];
    return `kvartal ${n} ${year} (${quarter.short})`;
  }
  return `${MONTH_NAMES[n - 1]} ${year}`;
}

function clampPeriod(kind: CompanyVatPeriod, number: number): number {
  const max = periodCount(kind);
  if (!Number.isInteger(number) || number < 1) return 1;
  if (number > max) return max;
  return number;
}

export function isDateLocked(
  date: string,
  lockedThrough: string | null | undefined
): boolean {
  return Boolean(lockedThrough && date <= lockedThrough);
}

/**
 * Överblivna månadslås räknas inte vid kvartal/helår — bara giltiga
 * periodslut (31 mar/30 jun/30 sep/31 dec eller 31 dec).
 */
export function effectiveLockedThrough(
  lockedThrough: string | null | undefined,
  kind: CompanyVatPeriod
): string | null {
  if (!lockedThrough) return null;
  if (kind === "manad") return lockedThrough;
  return isLockBoundary(lockedThrough, kind) ? lockedThrough : null;
}

export function periodLockStatus(
  kind: CompanyVatPeriod,
  year: number,
  number: number,
  lockedThrough: string | null | undefined
): MonthLockStatus {
  const effective = effectiveLockedThrough(lockedThrough, kind);
  if (!effective) return "open";
  const from = periodStartIso(kind, year, number);
  const to = periodEndIso(kind, year, number);
  if (effective >= to) return "locked";
  if (kind === "manad" && effective >= from) return "partial";
  return "open";
}

export function periodStatusLabel(
  status: MonthLockStatus,
  lockedThrough: string | null | undefined
): string {
  if (status === "locked") return "Låst";
  if (status === "partial" && lockedThrough) {
    return `Delvis låst t.o.m. ${formatIsoDateSv(lockedThrough)}`;
  }
  if (status === "partial") return "Delvis låst";
  return "Öppen";
}

export function formatIsoDateSv(iso: string): string {
  const parts = parseIsoDateParts(iso);
  if (!parts) return iso;
  return `${parts.day} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
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

export function isLockBoundary(
  iso: string,
  kind: CompanyVatPeriod
): boolean {
  const parts = parseIsoDateParts(iso);
  if (!parts) return false;
  const end = lastDayOfMonth(parts.year, parts.month);
  if (parts.day !== end) return false;
  if (kind === "manad") return true;
  if (kind === "kvartal") {
    return parts.month === 3 || parts.month === 6 || parts.month === 9 || parts.month === 12;
  }
  return parts.month === 12;
}

export function periodContaining(
  iso: string,
  kind: CompanyVatPeriod
): { year: number; number: number } | null {
  const parts = parseIsoDateParts(iso);
  if (!parts) return null;
  if (kind === "ar") return { year: parts.year, number: 1 };
  if (kind === "kvartal") {
    return { year: parts.year, number: Math.ceil(parts.month / 3) };
  }
  return { year: parts.year, number: parts.month };
}

/** Nästa låspunkt framifrån enligt företagets momsperiod. */
export function nextLockTarget(
  lockedThrough: string | null | undefined,
  year: number,
  kind: CompanyVatPeriod = "manad"
): NextLockTarget {
  const effective = effectiveLockedThrough(lockedThrough, kind);
  if (!effective) {
    return lockTarget(kind, year, 1);
  }
  const containing = periodContaining(effective, kind);
  if (!containing) {
    return lockTarget(kind, year, 1);
  }
  const end = periodEndIso(kind, containing.year, containing.number);
  if (effective < end) {
    return lockTarget(kind, containing.year, containing.number);
  }
  if (containing.number >= periodCount(kind)) {
    return lockTarget(kind, containing.year + 1, 1);
  }
  return lockTarget(kind, containing.year, containing.number + 1);
}

export function lockTarget(
  kind: CompanyVatPeriod,
  year: number,
  number: number
): NextLockTarget {
  const n = clampPeriod(kind, number);
  return {
    year,
    number: n,
    through: periodEndIso(kind, year, n),
    label: periodLabel(kind, year, n),
  };
}

export function validateLockThrough(
  nextThrough: string,
  currentThrough: string | null | undefined,
  kind: CompanyVatPeriod = "manad"
): { ok: true; through: string } | { ok: false; error: string } {
  const parts = parseIsoDateParts(nextThrough);
  if (!parts) {
    return { ok: false, error: "Ogiltigt datum." };
  }
  const through = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const current = effectiveLockedThrough(currentThrough, kind);
  if (current && through <= current) {
    return {
      ok: false,
      error: `Redan låst t.o.m. ${formatIsoDateSv(current)}. Välj en senare period.`,
    };
  }
  if (!isLockBoundary(through, kind)) {
    if (kind === "kvartal") {
      return { ok: false, error: "Vid kvartalsmoms låses bara hela kvartal." };
    }
    if (kind === "ar") {
      return { ok: false, error: "Vid helårsmoms låses hela året." };
    }
    return { ok: false, error: "Vid månadsmoms låses hela månader." };
  }
  return { ok: true, through };
}

export function buildPeriodRows(
  kind: CompanyVatPeriod,
  year: number,
  lockedThrough: string | null | undefined
): LockPeriodRow[] {
  const effective = effectiveLockedThrough(lockedThrough, kind);
  const rows: LockPeriodRow[] = [];
  for (let number = 1; number <= periodCount(kind); number += 1) {
    const status = periodLockStatus(kind, year, number, lockedThrough);
    rows.push({
      year,
      number,
      label: periodLabel(kind, year, number),
      from: periodStartIso(kind, year, number),
      to: periodEndIso(kind, year, number),
      status,
      statusLabel: periodStatusLabel(status, effective),
    });
  }
  return rows;
}

export function lockablePeriods(
  kind: CompanyVatPeriod,
  year: number,
  lockedThrough: string | null | undefined
): NextLockTarget[] {
  const next = nextLockTarget(lockedThrough, year, kind);
  const options: NextLockTarget[] = [];
  let cursorYear = next.year;
  let cursorNumber = next.number;
  const max = periodCount(kind);
  while (cursorYear < year || (cursorYear === year && cursorNumber <= max)) {
    if (cursorYear === year) {
      options.push(lockTarget(kind, cursorYear, cursorNumber));
    }
    if (cursorNumber >= max) {
      cursorYear += 1;
      cursorNumber = 1;
    } else {
      cursorNumber += 1;
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

export function vatLockKindLabel(kind: CompanyVatPeriod): string {
  return VAT_PERIOD_LABELS[kind];
}

/** Månader som ingår i en låsperiod, för att summera verifikationer. */
export function monthsInPeriod(
  kind: CompanyVatPeriod,
  number: number
): number[] {
  if (kind === "ar") {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  if (kind === "kvartal") {
    const quarter = QUARTERS[clampPeriod(kind, number) - 1];
    return [quarter.start, quarter.start + 1, quarter.end];
  }
  return [clampPeriod(kind, number)];
}
