import { guessCostAccount, readInvoiceVat, skipsSupplierLedger } from "@/lib/voucher-suggestion";

export type SupplierProposalSource = {
  documentId: string;
  fileName: string;
  text: string;
  invoiceNumber: string | null;
  totalOre: number | null;
};

export type BankPayment = {
  date: string;
  amountOre: number;
  referenceNumber: string | null;
  description: string;
};

export type ExistingSupplierInvoice = {
  supplierName: string;
  invoiceNumber: string;
  totalOre: number;
};

export type SupplierInvoiceProposalLine = {
  accountNumber: string;
  debitOre: number;
  creditOre: number;
};

export type SupplierInvoiceProposal = {
  documentId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  totalOre: number;
  vatOre: number;
  costAccount: string;
  netOre: number;
  /** Sätts när bara påminnelse, inkasso och ränta ska bokföras. */
  lines?: SupplierInvoiceProposalLine[];
};

function supplierFromDescription(description: string): string {
  const parts = description.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts[parts.length - 1];
  const name: string[] = [];
  for (const word of description.split(/\s+/)) {
    if (/^[A-ZÅÄÖ]/.test(word)) {
      name.push(word);
      continue;
    }
    break;
  }
  return name.join(" ");
}

function supplierFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/^[\s._-]+|[\s._-]+$/g, "");
  const withoutNumber = stem.replace(/^faktura[\s._-]*\d+$/i, "").trim();
  const words = (withoutNumber || stem).replace(/[-_]+/g, " ").replace(/\d+/g, " ").trim();
  if (!words || /^faktura$/i.test(words)) return "";
  return words
    .split(/\s+/)
    .map((word) => word.charAt(0).toLocaleUpperCase("sv") + word.slice(1))
    .join(" ");
}

function dateIn(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}\\s*[:.]?\\s*(\\d{4}-\\d{2}-\\d{2})`, "i"));
  return match?.[1] ?? null;
}

function matchingPayment(source: SupplierProposalSource, payments: BankPayment[]): BankPayment | null {
  const number = source.invoiceNumber?.replace(/\D/g, "") ?? "";
  if (number) {
    const byReference = payments.find((payment) => payment.referenceNumber?.replace(/\D/g, "") === number);
    if (byReference) return byReference;
  }
  const token = source.fileName.toLocaleLowerCase("sv").match(/[a-zåäö]{4,}/)?.[0];
  if (!token || token === "faktura") return null;
  return (
    payments.find(
      (payment) => payment.amountOre < 0 && payment.description.toLocaleLowerCase("sv").includes(token)
    ) ?? null
  );
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function labeledOre(text: string, label: RegExp): number | null {
  const match = text.match(new RegExp(`(?:${label.source})\\s*[:.]?\\s*([\\d \\u00a0.]+,\\d{2})`, "i"));
  if (!match) return null;
  const normalized = match[1].replace(/[\s\u00a0.]/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

/** Grundfaktura som redan ligger inne för samma leverantör eller samma fakturanummer. */
function coveredBase(
  supplierName: string,
  invoiceNumber: string,
  totalOre: number,
  text: string,
  existing: ExistingSupplierInvoice[]
): ExistingSupplierInvoice | null {
  const followUp = /påminnelse|paminnelse|inkasso|dröjsmålsränta|drojsmalsranta|\bränta\b|\branta\b/.test(
    text.toLocaleLowerCase("sv")
  );
  const number = onlyDigits(invoiceNumber);
  const sameNumber = existing.filter(
    (invoice) =>
      number.length > 0 &&
      onlyDigits(invoice.invoiceNumber) === number &&
      invoice.totalOre > 0 &&
      invoice.totalOre < totalOre
  );
  const supplier = supplierName.trim().toLocaleLowerCase("sv");
  const sameSupplier = existing.filter(
    (invoice) =>
      invoice.supplierName.trim().toLocaleLowerCase("sv") === supplier &&
      invoice.totalOre > 0 &&
      invoice.totalOre < totalOre
  );
  const candidates = sameNumber.length > 0 ? sameNumber : followUp ? sameSupplier : [];
  return candidates.sort((a, b) => b.totalOre - a.totalOre)[0] ?? null;
}

/** Bara det som tillkommit: påminnelse och inkasso 5711, ränta 8422, mot 2440. */
function excessLines(text: string, excessOre: number): SupplierInvoiceProposalLine[] {
  const reminder = labeledOre(text, /påminnelseavgift|paminnelseavgift/);
  const collection = labeledOre(text, /inkassoavgift/);
  const interest = labeledOre(text, /dröjsmålsränta|drojsmalsranta|\bränta\b|\branta\b/);
  const found = [
    reminder == null ? null : { accountNumber: "5711", ore: reminder },
    collection == null ? null : { accountNumber: "5711", ore: collection },
    interest == null ? null : { accountNumber: "8422", ore: interest },
  ].filter((line): line is { accountNumber: string; ore: number } => line != null && line.ore > 0);
  const summed = found.reduce((sum, line) => sum + line.ore, 0);
  const charges =
    found.length > 0 && summed === excessOre
      ? found
      : [
          {
            accountNumber: /påminnelse|paminnelse|inkasso/.test(text.toLocaleLowerCase("sv")) ? "5711" : "8422",
            ore: excessOre,
          },
        ];
  return [
    ...charges.map((line) => ({
      accountNumber: line.accountNumber,
      debitOre: line.ore,
      creditOre: 0,
    })),
    { accountNumber: "2440", debitOre: 0, creditOre: excessOre },
  ];
}

/** Förslag till inköpslistan, eller null om underlaget inte är en leverantörsfaktura. */
export function proposeSupplierInvoice(
  source: SupplierProposalSource,
  payments: BankPayment[],
  existing: ExistingSupplierInvoice[] = []
): SupplierInvoiceProposal | null {
  const payment = matchingPayment(source, payments);
  const haystack = `${source.fileName}\n${source.text}\n${payment?.description ?? ""}`;
  if (skipsSupplierLedger(haystack)) return null;

  const invoiceNumber = (source.invoiceNumber ?? payment?.referenceNumber ?? "").trim();
  if (!invoiceNumber) return null;

  const totalOre = source.totalOre ?? (payment && payment.amountOre < 0 ? -payment.amountOre : null);
  if (totalOre == null || totalOre <= 0) return null;

  const supplierName =
    supplierFromDescription(payment?.description ?? "") || supplierFromFileName(source.fileName);
  if (!supplierName) return null;

  const cost = guessCostAccount(haystack.replace(/[-_]+/g, " "));
  const base = coveredBase(supplierName, invoiceNumber, totalOre, haystack, existing);
  if (base) {
    const excessOre = totalOre - base.totalOre;
    const lines = excessLines(haystack, excessOre);
    const netOre = lines
      .filter((line) => line.accountNumber !== "2440")
      .reduce((sum, line) => sum + line.debitOre, 0);
    return {
      documentId: source.documentId,
      supplierName,
      invoiceNumber,
      invoiceDate: dateIn(source.text, "fakturadatum") ?? payment?.date ?? null,
      dueDate: dateIn(source.text, "förfallodatum") ?? dateIn(source.text, "forfallodatum"),
      paymentDate: payment?.date ?? null,
      totalOre: excessOre,
      vatOre: 0,
      costAccount: lines.find((line) => line.accountNumber !== "2440")?.accountNumber ?? "5711",
      netOre,
      lines,
    };
  }
  const vat = readInvoiceVat(source.text);
  const vatOre = vat?.vatOre ?? (cost?.taxable === false ? 0 : Math.round(totalOre - totalOre / 1.25));
  const netOre = vat?.netOre ?? totalOre - vatOre;

  return {
    documentId: source.documentId,
    supplierName,
    invoiceNumber,
    invoiceDate: dateIn(source.text, "fakturadatum") ?? payment?.date ?? null,
    dueDate: dateIn(source.text, "förfallodatum") ?? dateIn(source.text, "forfallodatum"),
    paymentDate: payment?.date ?? null,
    totalOre,
    vatOre,
    costAccount: cost?.account ?? "0",
    netOre,
  };
}
