import type { Metadata } from "next";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankTransactions, invoices } from "@/lib/db/schema";
import { customerPaymentDate } from "@/lib/customer-payment";
import { CustomerInvoiceTable } from "./invoice-table";

export const metadata: Metadata = { title: "Kundfakturor" };

const TYPE_LABELS: Record<string, string> = {
  faktura: "Faktura",
  kvitto: "Kvitto",
  kreditfaktura: "Kreditfaktura",
  avrakning: "Avräkning",
};

export default async function KundfakturorPage({
  params,
}: PageProps<"/foretag/[id]/kundfakturor">) {
  const { id } = await params;
  const [rows, payments] = await Promise.all([
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        reference: invoices.reference,
        invoiceType: invoices.invoiceType,
        customerName: invoices.customerName,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        totalOre: invoices.totalOre,
        currency: invoices.currency,
        paymentDate: invoices.paymentDate,
      })
      .from(invoices)
      .where(eq(invoices.companyId, id)),
    db
      .select({
        date: bankTransactions.bookedDate,
        amountOre: bankTransactions.amountOre,
        referenceNumber: bankTransactions.referenceNumber,
      })
      .from(bankTransactions)
      .where(and(eq(bankTransactions.companyId, id), gt(bankTransactions.amountOre, 0))),
  ]);

  for (const row of rows) {
    if (row.paymentDate) continue;
    const date = customerPaymentDate(row, payments);
    if (!date) continue;
    row.paymentDate = date;
    await db
      .update(invoices)
      .set({ paymentDate: date })
      .where(and(eq(invoices.id, row.id), isNull(invoices.paymentDate)));
  }

  rows.sort((a, b) => Number(b.number) - Number(a.number));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="w-full flex-1">
      <CustomerInvoiceTable
        companyId={id}
        rows={rows.map((row) => ({
          id: row.id,
          number: row.number,
          invoiceType: TYPE_LABELS[row.invoiceType] ?? row.invoiceType,
          customerName: row.customerName,
          invoiceDate: row.invoiceDate,
          dueDate: row.dueDate,
          totalOre: row.totalOre,
          currency: row.currency,
          paymentDate: row.paymentDate,
          status: row.paymentDate ? "Betald" : row.dueDate && row.dueDate < today ? "Förfallen" : "Obetald",
        }))}
      />
    </main>
  );
}
