export type SuggestedPosting = {
  accountNumber: string;
  debitOre: number;
  creditOre: number;
};

function parseOre(value: string): number | null {
  const normalized = value.replace(/[\s\u00a0]/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

/** Netto och moms när fakturan skriver "6 000,00 kr x 25% = 1 500,00 kr". */
export function readInvoiceVat(text: string): { netOre: number; vatOre: number; rate: 6 | 12 | 25 } | null {
  const match = text.match(
    /([\d \u00a0]+,\d{2})\s*kr\s*x\s*(6|12|25)\s*%\s*=\s*([\d \u00a0]+,\d{2})/i
  );
  if (!match) return null;
  const netOre = parseOre(match[1]);
  const vatOre = parseOre(match[3]);
  const rate = Number(match[2]);
  if (netOre == null || vatOre == null || (rate !== 6 && rate !== 12 && rate !== 25)) return null;
  return { netOre, vatOre, rate };
}

const OUTPUT_VAT: Record<6 | 12 | 25, string> = { 25: "2611", 12: "2621", 6: "2631" };
const INPUT_VAT: Record<6 | 12 | 25, string> = { 25: "2641", 12: "2645", 6: "2647" };

const COST_RULES: { account: string; taxable: boolean; pattern: RegExp }[] = [
  { account: "5013", taxable: true, pattern: /lagerhyra|hyra för lager/ },
  { account: "5012", taxable: true, pattern: /garagehyra|hyra för garage/ },
  { account: "5010", taxable: true, pattern: /lokalhyra|\bhyra\b|kontorshus/ },
  { account: "5020", taxable: true, pattern: /elnät|elräkning|\bel\b/ },
  { account: "5061", taxable: true, pattern: /städning|städ/ },
  { account: "6110", taxable: true, pattern: /pärm|penna|pennor|papper|anteckning|kontorsmateri|toner/ },
  { account: "5611", taxable: true, pattern: /drivmedel|bensin|diesel|circle\s*k|okq8|preem/ },
  { account: "6310", taxable: false, pattern: /försäkring|forsakring|folksam|trygg-hansa/ },
  { account: "6212", taxable: true, pattern: /mobil|abonnemang|telia|tele2|telenor/ },
  { account: "5420", taxable: true, pattern: /programvara|mjukvara|licens|microsoft|visma|adobe/ },
  { account: "6250", taxable: true, pattern: /\bporto\b|frimärk/ },
  { account: "6570", taxable: false, pattern: /bankavgift|bankkostnad|aviavgift/ },
];

/**
 * Inte en leverantörsfaktura, även om underlaget ser ut som en faktura.
 * Övriga leverantörsfakturor går via 2440 på fakturametoden.
 * Utanför: skatter (även Transportstyrelsen), försäkringar, prenumerationer,
 * frivilliga medlemsavgifter, proformafakturor, tullavgifter, böter,
 * löpande kortdragningar, förskottsbetalda abonnemang som upphör
 * om betalningen uteblir, och bankavgifter. Bindande abonnemang
 * som faktureras, till exempel mobilabonnemang, ingår.
 */
const NOT_SUPPLIER_INVOICE =
  /skatteverket|transportstyrelsen|arbetsgivaravgift|egenavgift|fordonsskatt|trängselskatt|trangselskatt|\bskatt\b|försäkring|forsakring|folksam|trygg-hansa|\bfora\b|prenumeration|medlemsavgift|proforma|tullavgift|\btull\b|böter|boter|parkeringsbot|kontrollavgift|\bbot\b|förskottsbetal|forskottsbetal|ej bindande|icke bindande|icke-bindande|kortdragning|kortköp|kortkop|bankavgift|bankkostnad|aviavgift/;

export function skipsSupplierLedger(text: string): boolean {
  return NOT_SUPPLIER_INVOICE.test(text.toLocaleLowerCase("sv"));
}

/** Kostnadskonto utifrån vad texten handlar om. */
export function guessCostAccount(text: string): { account: string; taxable: boolean } | null {
  const haystack = text.toLocaleLowerCase("sv");
  for (const rule of COST_RULES) {
    if (rule.pattern.test(haystack)) return { account: rule.account, taxable: rule.taxable };
  }
  return null;
}

function splitGross(grossOre: number, rate: 6 | 12 | 25): { netOre: number; vatOre: number } {
  const netOre = Math.round(grossOre / (1 + rate / 100));
  return { netOre, vatOre: grossOre - netOre };
}

/**
 * Förslag utöver bankraden. Kostnadskontot tolkas ur texten.
 * Saknas momsuppdelning på en vanlig inköpsfaktura antas 25 %.
 */
export function suggestedPostings(input: {
  kind: string;
  text: string;
  revenueAccount: string | null;
  grossOre?: number | null;
  accountingMethod?: "faktura" | "kontant" | null;
  /** 2440 föreslås bara när en sparad leverantörsfaktura styrker beloppet. */
  backedBySupplierInvoice?: boolean;
}): SuggestedPosting[] {
  const gross = input.grossOre ?? 0;
  const invoiceMethod = input.accountingMethod === "faktura";
  const vat = readInvoiceVat(input.text);
  if (input.kind === "kundfaktura") {
    if (invoiceMethod && gross > 0) {
      return [{ accountNumber: "1510", debitOre: 0, creditOre: gross }];
    }
    if (!vat) return [];
    const lines: SuggestedPosting[] = [];
    if (input.revenueAccount) {
      lines.push({ accountNumber: input.revenueAccount, debitOre: 0, creditOre: vat.netOre });
    }
    lines.push({ accountNumber: OUTPUT_VAT[vat.rate], debitOre: 0, creditOre: vat.vatOre });
    return lines;
  }
  if (input.kind !== "leverantorsfaktura" && input.kind !== "kvitto") return [];
  if (
    invoiceMethod &&
    input.backedBySupplierInvoice &&
    input.kind === "leverantorsfaktura" &&
    !skipsSupplierLedger(input.text) &&
    gross > 0
  ) {
    return [{ accountNumber: "2440", debitOre: gross, creditOre: 0 }];
  }

  const cost = guessCostAccount(input.text);
  if (vat) {
    const lines: SuggestedPosting[] = [];
    if (cost) lines.push({ accountNumber: cost.account, debitOre: vat.netOre, creditOre: 0 });
    lines.push({ accountNumber: INPUT_VAT[vat.rate], debitOre: vat.vatOre, creditOre: 0 });
    return lines;
  }
  if (!cost || gross <= 0) return [];
  if (!cost.taxable) {
    return [{ accountNumber: cost.account, debitOre: gross, creditOre: 0 }];
  }
  const split = splitGross(gross, 25);
  return [
    { accountNumber: cost.account, debitOre: split.netOre, creditOre: 0 },
    { accountNumber: "2641", debitOre: split.vatOre, creditOre: 0 },
  ];
}
