/**
 * Systemlista med vanliga svenska momskoder (Visma-liknande).
 * Koppling kod → deklarationsruta finns i lib/vat-declaration.ts.
 */
export type VatCodeDefinition = {
  code: string;
  name: string;
};

export const VAT_CODES: readonly VatCodeDefinition[] = [
  { code: "U25", name: "Utgående moms 25 %" },
  { code: "U12", name: "Utgående moms 12 %" },
  { code: "U6", name: "Utgående moms 6 %" },
  { code: "I25", name: "Ingående moms 25 %" },
  { code: "I12", name: "Ingående moms 12 %" },
  { code: "I6", name: "Ingående moms 6 %" },
  { code: "MF", name: "Momsfritt" },
  { code: "UEU", name: "Försäljning till annat EU-land" },
  { code: "IEU", name: "EU-förvärv" },
  { code: "UOS", name: "Utgående moms, omvänd skattskyldighet" },
  { code: "IOS", name: "Ingående moms, omvänd skattskyldighet" },
];

const VAT_CODE_SET = new Set(VAT_CODES.map((item) => item.code));

/** Uppenbar default per kontonummer — bara där koden är given av BAS. */
const OBVIOUS_ACCOUNT_VAT: Readonly<Record<string, string>> = {
  "2610": "U25",
  "2611": "U25",
  "2612": "U25",
  "2613": "U25",
  "2615": "U25",
  "2616": "U25",
  "2620": "U12",
  "2621": "U12",
  "2622": "U12",
  "2623": "U12",
  "2625": "U12",
  "2626": "U12",
  "2630": "U6",
  "2631": "U6",
  "2632": "U6",
  "2633": "U6",
  "2635": "U6",
  "2636": "U6",
  "2640": "I25",
  "2641": "I25",
  "2642": "I25",
  "2646": "I25",
  "2649": "I25",
  "3001": "U25",
  "3002": "U12",
  "3003": "U6",
  "3004": "MF",
};

export function isVatCode(value: string | null | undefined): value is string {
  return Boolean(value && VAT_CODE_SET.has(value));
}

export function vatCodeName(code: string | null | undefined): string {
  if (!code) return "";
  return VAT_CODES.find((item) => item.code === code)?.name ?? code;
}

export function parseVatCode(
  value: string | null | undefined
): { ok: true; code: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, code: null };
  const code = value.trim();
  if (code === "") return { ok: true, code: null };
  if (!VAT_CODE_SET.has(code)) {
    return { ok: false, error: "Ogiltig momskod." };
  }
  return { ok: true, code };
}

function vatRate(name: string): "25" | "12" | "6" | null {
  if (name.includes("25 %") || name.includes("25%")) return "25";
  if (name.includes("12 %") || name.includes("12%")) return "12";
  if (name.includes("6 %") || name.includes("6%")) return "6";
  return null;
}

/**
 * Gissar default-momskod från kontonummer och BAS-namn.
 * Saknas tydlig ledtråd lämnas fältet tomt — hellre tomt än fel.
 */
export function defaultVatCode(number: string, name: string): string | null {
  const obvious = OBVIOUS_ACCOUNT_VAT[number];
  if (obvious) return obvious;

  const lower = name.toLocaleLowerCase("sv");
  const rate = vatRate(lower);
  const isEu =
    lower.includes("annat eu-land") ||
    lower.includes("eu-land") ||
    lower.includes("inom eu");
  const isReverse = lower.includes("omvänd");
  const isExempt = lower.includes("momsfri");

  if (number.startsWith("26")) {
    if (lower.includes("redovisningskonto") || lower.includes("punktskatt")) {
      return null;
    }
    if (isReverse && lower.includes("ingående")) return "IOS";
    if (isReverse && lower.includes("utgående")) return "UOS";
    if (lower.includes("ingående")) return rate ? `I${rate}` : "I25";
    if (lower.includes("utgående")) return rate ? `U${rate}` : null;
    return null;
  }

  if (number.startsWith("3")) {
    if (isEu && !lower.includes("momspliktig") && (isExempt || !rate)) {
      return "UEU";
    }
    if (isExempt) return "MF";
    if (rate && lower.includes("försäljning")) return `U${rate}`;
    return null;
  }

  if (number.startsWith("4")) {
    if (isReverse) return "IOS";
    if (isEu) return "IEU";
    if (isExempt) return "MF";
    if (rate && lower.includes("inköp")) return `I${rate}`;
    return null;
  }

  if (/^[5-8]/.test(number) && lower.includes("moms")) {
    if (lower.includes("ingående")) return rate ? `I${rate}` : "I25";
    if (rate) return `I${rate}`;
  }

  return null;
}
