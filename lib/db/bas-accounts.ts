/**
 * Hela BAS 2026-kontoplanen (kontonummer + namn).
 *
 * Källa: BAS-kontogruppen i Stockholm AB, officiell kontotabell
 * `BAS_kontoplan_2026_v2.xlsx` (gratis nedladdning på https://www.bas.se/kontoplaner/).
 * Extraherad till data/bas-2026.json — BAS 2026 plus 6240 Dataprogramvaror.
 */
import rawAccounts from "../../data/bas-2026.json";

export const BAS_YEAR = 2026;

export type AccountDraft = {
  number: string;
  name: string;
};

export const BAS_ACCOUNTS: readonly AccountDraft[] = rawAccounts;

export const BAS_CHARTS = [
  { id: "bas-2026-ab", label: "BAS 2026 AB" },
  { id: "bas-2026-ef", label: "BAS 2026 EF" },
] as const;

export type BasChartId = (typeof BAS_CHARTS)[number]["id"];

/** Enskild firma: ägarens kapital, expansionsfond och egna uttag. */
const EF_ONLY = new Set([
  "2010",
  "2011",
  "2013",
  "2017",
  "2018",
  "2019",
  "2050",
  "2612",
  "2622",
  "2632",
  "3400",
  "3401",
  "3402",
  "3403",
  "3404",
]);

function inRange(number: string, from: string, to: string): boolean {
  return number >= from && number <= to;
}

/** Handelsbolag, förening, stiftelse och bostadsrätt — varken AB eller EF. */
function isOtherLegalForm(number: string): boolean {
  return (
    inRange(number, "2020", "2049") ||
    inRange(number, "2060", "2072") ||
    number === "2083" ||
    number === "2084" ||
    number === "2087" ||
    number === "2088" ||
    number === "6700"
  );
}

/** Aktiebolagets eget kapital, aktieteckning och koncernbidrag. */
function isAbOnly(number: string): boolean {
  return (
    inRange(number, "2080", "2099") ||
    number === "1690" ||
    number === "8820" ||
    number === "8830"
  );
}

export function accountsForBasChart(id: BasChartId): readonly AccountDraft[] {
  return BAS_ACCOUNTS.filter((account) => {
    const number = account.number;
    if (isOtherLegalForm(number)) return false;
    if (id === "bas-2026-ab") return !EF_ONLY.has(number);
    return !isAbOnly(number);
  });
}

export function parseBasChart(
  value: unknown
): { ok: true; value: BasChartId } | { ok: false; error: string } {
  const id = String(value ?? "");
  const chart = BAS_CHARTS.find((item) => item.id === id);
  if (!chart) return { ok: false, error: "Välj kontoplan BAS 2026 AB eller BAS 2026 EF." };
  return { ok: true, value: chart.id };
}

export const DEFAULT_SERIES_LETTER = "A";
export const DEFAULT_SERIES_DESCRIPTION = "Verifikationsserie A";

/** Serier som ett företag på fakturametoden alltid ska ha. */
export const INVOICE_METHOD_SERIES = [
  { letter: "A", description: "1930" },
  { letter: "K", description: "Kundfakturor" },
  { letter: "L", description: "Leverantörsfakturor" },
] as const;

export const ACCOUNT_NUMBER_PATTERN = /^\d{4}$/;
export const MAX_CHART_ACCOUNTS = 2500;

export function matchesAccountQuery(
  account: { number: string; name: string },
  query: string
): boolean {
  const q = query.trim().toLocaleLowerCase("sv");
  if (!q) return true;
  return (
    account.number.includes(q) ||
    account.name.toLocaleLowerCase("sv").includes(q)
  );
}

export function parseAccountDrafts(
  raw: string
): { accounts: AccountDraft[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Kontoplanen kunde inte läsas." };
  }
  if (!Array.isArray(parsed)) {
    return { error: "Kontoplanen är ogiltig." };
  }
  if (parsed.length === 0) {
    return { error: "Kontoplanen måste innehålla minst ett konto." };
  }
  if (parsed.length > MAX_CHART_ACCOUNTS) {
    return { error: "Kontoplanen innehåller för många konton." };
  }

  const seen = new Set<string>();
  const accounts: AccountDraft[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return { error: "Kontoplanen innehåller en ogiltig rad." };
    }
    const number = String(
      (item as { number?: unknown }).number ?? ""
    ).trim();
    const name = String((item as { name?: unknown }).name ?? "").trim();
    if (!ACCOUNT_NUMBER_PATTERN.test(number)) {
      return {
        error: `Kontonumret ${number || "saknas"} måste vara fyra siffror.`,
      };
    }
    if (!name) {
      return { error: `Kontot ${number} saknar namn.` };
    }
    if (name.length > 200) {
      return { error: `Kontonamnet på ${number} är för långt.` };
    }
    if (seen.has(number)) {
      return { error: `Kontonumret ${number} används mer än en gång.` };
    }
    seen.add(number);
    accounts.push({ number, name });
  }

  accounts.sort((a, b) => a.number.localeCompare(b.number, "sv"));
  return { accounts };
}

export { defaultVatCode } from "../vat-codes";
