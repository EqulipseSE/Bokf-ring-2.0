/**
 * Svenska verifikationsdatum. Visas alltid som YYYY-MM-DD.
 *
 * Referensdatum = senast använda verifikationsdatum (annars idag).
 *
 * Siffror (mellanslag, bindestreck, slash och punkt tas bort):
 *   1–2  dag i referensmånaden           6 → 2026-10-06,  26 → 2026-10-26
 *   3    M+DD (månad 1–9)                625 → 2026-06-25
 *   4    MMDD i referensåret             1026 → 2026-10-26
 *   6    ÅÅMMDD med sekel 20             261025 → 2026-10-25,  251025 → 2025-10-25
 *   8    YYYYMMDD                        20261025 → 2026-10-25
 * Redan ifyllt YYYY-MM-DD (eller YYYY/MM/DD) accepteras om dagen finns i kalendern.
 *
 * Ogiltig dag/månad (t.ex. 31 november) ger fel — aldrig tyst overflow till nästa månad.
 */

export type ParsedVoucherDate =
  | { ok: true; iso: string }
  | { ok: false; error: string };

export function parseVoucherDate(
  raw: string,
  referenceIso: string
): ParsedVoucherDate {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Fyll i datum." };
  }

  const reference = parseIsoParts(referenceIso) ?? todayParts();
  const digits = trimmed.replace(/[\s./-]/g, "");

  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: "Ogiltigt datum." };
  }

  if (digits.length === 1 || digits.length === 2) {
    return ymd(reference.year, reference.month, Number(digits));
  }
  if (digits.length === 3) {
    return ymd(reference.year, Number(digits[0]), Number(digits.slice(1)));
  }
  if (digits.length === 4) {
    return ymd(
      reference.year,
      Number(digits.slice(0, 2)),
      Number(digits.slice(2))
    );
  }
  if (digits.length === 6) {
    return ymd(
      2000 + Number(digits.slice(0, 2)),
      Number(digits.slice(2, 4)),
      Number(digits.slice(4))
    );
  }
  if (digits.length === 8) {
    return ymd(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)),
      Number(digits.slice(6))
    );
  }

  return { ok: false, error: "Ogiltigt datum." };
}

export function isValidIsoDate(iso: string): boolean {
  return parseIsoParts(iso) !== null;
}

export function todayIsoDate(): string {
  const parts = todayParts();
  return formatIso(parts.year, parts.month, parts.day);
}

function ymd(year: number, month: number, day: number): ParsedVoucherDate {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return { ok: false, error: "Ogiltigt datum." };
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return { ok: false, error: "Ogiltigt datum." };
  }
  return { ok: true, iso: formatIso(year, month, day) };
}

function parseIsoParts(
  iso: string
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = ymd(year, month, day);
  if (!parsed.ok) return null;
  return { year, month, day };
}

function todayParts(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function formatIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
