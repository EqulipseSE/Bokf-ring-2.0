export type CustomerPayment = {
  date: string;
  amountOre: number;
  referenceNumber: string | null;
};

function digits(value: string | null | undefined): string {
  const raw = (value ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return raw || "";
}

/** Betaldatum från banken när referens och belopp stämmer. */
export function customerPaymentDate(
  invoice: { number: string; totalOre: number; reference?: string | null },
  payments: CustomerPayment[]
): string | null {
  const number = digits(invoice.number);
  const reference = digits(invoice.reference);
  const hit = payments.find((payment) => {
    if (payment.amountOre !== invoice.totalOre || payment.amountOre <= 0) return false;
    const bank = digits(payment.referenceNumber);
    if (!bank) return false;
    return bank === number || (reference !== "" && bank === reference);
  });
  return hit?.date ?? null;
}
