export type SupplierInvoiceCandidate = {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  totalOre: number;
  paymentDate: string | null;
  documentId: string | null;
};

export type SupplierInvoicePart = {
  invoice: SupplierInvoiceCandidate;
  ore: number;
};

/** Påminnelseavgift som får ligga ovanpå en grundfaktura, högst 600 kr. */
const REMINDER_FEE_MAX_ORE = 1_000_000;

function digits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function sameSupplier(a: SupplierInvoiceCandidate, b: SupplierInvoiceCandidate): boolean {
  return a.supplierName.trim().toLocaleLowerCase("sv") === b.supplierName.trim().toLocaleLowerCase("sv");
}

function numberMatches(invoice: SupplierInvoiceCandidate, reference: string): boolean {
  const number = digits(invoice.invoiceNumber);
  return number.length > 0 && (reference === number || reference.endsWith(number));
}

/** Grundfaktura hos samma leverantör, närmast under påminnelsebeloppet. */
function baseInvoice(
  reminder: SupplierInvoiceCandidate,
  invoices: SupplierInvoiceCandidate[]
): SupplierInvoiceCandidate | null {
  const bases = invoices
    .filter(
      (invoice) =>
        invoice.id !== reminder.id &&
        sameSupplier(invoice, reminder) &&
        invoice.totalOre < reminder.totalOre &&
        reminder.totalOre - invoice.totalOre <= REMINDER_FEE_MAX_ORE
    )
    .sort((a, b) => b.totalOre - a.totalOre);
  return bases[0] ?? null;
}

function splitReminder(
  reminder: SupplierInvoiceCandidate,
  invoices: SupplierInvoiceCandidate[]
): SupplierInvoicePart[] {
  const base = baseInvoice(reminder, invoices);
  if (!base) return [{ invoice: reminder, ore: reminder.totalOre }];
  return [
    { invoice: base, ore: base.totalOre },
    { invoice: reminder, ore: reminder.totalOre - base.totalOre },
  ];
}

/**
 * Leverantörsfakturor som styrker en utbetalning mot 2440.
 * En påminnelsefaktura på hela kravbeloppet delas i grundfaktura och avgift.
 */
export function matchSupplierInvoice(
  transaction: { amountOre: number; description: string; referenceNumber: string | null },
  invoices: SupplierInvoiceCandidate[]
): SupplierInvoicePart[] | null {
  if (transaction.amountOre >= 0) return null;
  const amount = Math.abs(transaction.amountOre);
  const reference = digits(transaction.referenceNumber ?? "");
  const description = transaction.description.toLocaleLowerCase("sv");

  if (reference) {
    const byNumber = invoices.filter((invoice) => invoice.totalOre === amount && numberMatches(invoice, reference));
    if (byNumber.length === 1) return splitReminder(byNumber[0], invoices);
  }

  const byName = invoices.filter((invoice) => {
    if (invoice.totalOre !== amount) return false;
    const name = invoice.supplierName.trim().toLocaleLowerCase("sv");
    return name.length >= 4 && description.includes(name);
  });
  if (byName.length === 1) return splitReminder(byName[0], invoices);

  const named = invoices.filter((invoice) => {
    const name = invoice.supplierName.trim().toLocaleLowerCase("sv");
    return name.length >= 4 && description.includes(name);
  });
  const suppliers = new Set(named.map((invoice) => invoice.supplierName.trim().toLocaleLowerCase("sv")));
  if (suppliers.size !== 1) return null;
  const fee = named.find(
    (invoice) => invoice.totalOre > 0 && invoice.totalOre <= REMINDER_FEE_MAX_ORE && invoice.totalOre < amount
  );
  const base = named.find((invoice) => fee && invoice.id !== fee.id && invoice.totalOre + fee.totalOre === amount);
  if (!fee || !base) return null;
  return [
    { invoice: base, ore: base.totalOre },
    { invoice: fee, ore: fee.totalOre },
  ];
}
