import { formatOre } from "@/lib/money";
import { assertDateOpen } from "@/lib/period-lock";
import { parseVatCode } from "@/lib/vat-codes";

export type VoucherSnapshotLine = {
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  vatCode: string | null;
};

export type VoucherSnapshot = {
  date: string;
  text: string;
  lines: VoucherSnapshotLine[];
};

export type VoucherChangeItem = {
  label: string;
  from: string | null;
  to: string | null;
};

export type VoucherLineInput = {
  accountId: string;
  debitOre: number;
  creditOre: number;
  vatCode?: string | null;
};

export function normalizeVatCode(value: string | null | undefined): string | null {
  const parsed = parseVatCode(value);
  return parsed.ok ? parsed.code : (value?.trim() || null);
}

export function snapshotLineKey(line: VoucherSnapshotLine): string {
  return [
    line.accountId,
    String(line.debit),
    String(line.credit),
    normalizeVatCode(line.vatCode) ?? "",
  ].join("|");
}

export function snapshotsEqual(
  before: VoucherSnapshot,
  after: VoucherSnapshot
): boolean {
  if (before.date !== after.date) return false;
  if (before.text !== after.text) return false;
  if (before.lines.length !== after.lines.length) return false;
  return before.lines.every(
    (line, index) => snapshotLineKey(line) === snapshotLineKey(after.lines[index])
  );
}

export function formatSnapshotLine(line: VoucherSnapshotLine): string {
  const side =
    line.debit > 0
      ? `debet ${formatOre(line.debit)}`
      : `kredit ${formatOre(line.credit)}`;
  const vat = line.vatCode ? ` · ${line.vatCode}` : "";
  return `${line.accountNumber} ${line.accountName}, ${side}${vat}`;
}

export function describeVoucherChange(
  before: VoucherSnapshot,
  after: VoucherSnapshot
): VoucherChangeItem[] {
  const items: VoucherChangeItem[] = [];
  if (before.date !== after.date) {
    items.push({ label: "Datum", from: before.date, to: after.date });
  }
  if (before.text !== after.text) {
    items.push({ label: "Text", from: before.text, to: after.text });
  }

  const max = Math.max(before.lines.length, after.lines.length);
  for (let index = 0; index < max; index += 1) {
    const previous = before.lines[index];
    const next = after.lines[index];
    const n = index + 1;
    if (!previous && next) {
      items.push({
        label: `Rad ${n} tillagd`,
        from: null,
        to: formatSnapshotLine(next),
      });
      continue;
    }
    if (previous && !next) {
      items.push({
        label: `Rad ${n} borttagen`,
        from: formatSnapshotLine(previous),
        to: null,
      });
      continue;
    }
    if (
      previous &&
      next &&
      snapshotLineKey(previous) !== snapshotLineKey(next)
    ) {
      items.push({
        label: `Rad ${n}`,
        from: formatSnapshotLine(previous),
        to: formatSnapshotLine(next),
      });
    }
  }
  return items;
}

/** Både nuvarande och nytt datum måste ligga i öppen period. */
export function assertVoucherEditable(
  currentDate: string,
  nextDate: string,
  lockedThrough: string | null | undefined
): { ok: true } | { ok: false; error: string } {
  const current = assertDateOpen(currentDate, lockedThrough);
  if (!current.ok) return current;
  return assertDateOpen(nextDate, lockedThrough);
}

export function formatChangeTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function buildVoucherSnapshot(
  date: string,
  text: string,
  lines: VoucherSnapshotLine[]
): VoucherSnapshot {
  return {
    date,
    text: text.trim(),
    lines: lines.map((line) => ({
      accountId: line.accountId,
      accountNumber: line.accountNumber,
      accountName: line.accountName,
      debit: line.debit,
      credit: line.credit,
      vatCode: normalizeVatCode(line.vatCode),
    })),
  };
}

export function validateVoucherLines(
  lines: VoucherLineInput[]
): { ok: true; lines: VoucherLineInput[] } | { ok: false; error: string } {
  const ready = lines.filter(
    (line) => line.accountId || line.debitOre > 0 || line.creditOre > 0
  );
  if (ready.length < 2) {
    return { ok: false, error: "Minst två rader krävs." };
  }

  let debitSum = 0;
  let creditSum = 0;
  for (const line of ready) {
    if (!line.accountId) {
      return { ok: false, error: "Varje rad måste ha ett konto." };
    }
    if (
      !Number.isInteger(line.debitOre) ||
      !Number.isInteger(line.creditOre) ||
      line.debitOre < 0 ||
      line.creditOre < 0
    ) {
      return { ok: false, error: "Belopp måste anges i hela öre." };
    }
    const hasDebit = line.debitOre > 0;
    const hasCredit = line.creditOre > 0;
    if (hasDebit === hasCredit) {
      return {
        ok: false,
        error: "Varje rad måste ha belopp i antingen debet eller kredit.",
      };
    }
    const parsedVat = parseVatCode(line.vatCode);
    if (!parsedVat.ok) {
      return { ok: false, error: parsedVat.error };
    }
    debitSum += line.debitOre;
    creditSum += line.creditOre;
  }

  if (debitSum !== creditSum) {
    return { ok: false, error: "Debet och kredit måste vara lika." };
  }
  if (debitSum === 0) {
    return { ok: false, error: "Verifikationen måste ha ett belopp." };
  }
  return { ok: true, lines: ready };
}
