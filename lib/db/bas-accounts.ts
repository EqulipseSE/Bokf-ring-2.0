/**
 * Hela BAS 2026-kontoplanen (kontonummer + namn).
 *
 * Källa: BAS-kontogruppen i Stockholm AB, officiell kontotabell
 * `BAS_kontoplan_2026_v2.xlsx` (gratis nedladdning på https://www.bas.se/kontoplaner/).
 * Extraherad till data/bas-2026.json — 1 282 konton, nummer 1010–8999.
 */
import rawAccounts from "../../data/bas-2026.json";

export const BAS_YEAR = 2026;

export type AccountDraft = {
  number: string;
  name: string;
};

export const BAS_ACCOUNTS: readonly AccountDraft[] = rawAccounts;

export const DEFAULT_SERIES_LETTER = "A";
export const DEFAULT_SERIES_DESCRIPTION = "Verifikationsserie A";

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
