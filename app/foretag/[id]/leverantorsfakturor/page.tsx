import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplierInvoices } from "@/lib/db/schema";
import { importPreliminarySupplierInvoices } from "@/lib/import-supplier-invoices";
import { SupplierInvoiceTable } from "./invoice-table";

export const metadata: Metadata = { title: "Leverantörsfakturor" };

export default async function LeverantorsfakturorPage({
  params,
}: PageProps<"/foretag/[id]/leverantorsfakturor">) {
  const { id } = await params;
  await importPreliminarySupplierInvoices(id);
  const rows = await db
    .select({
      id: supplierInvoices.id,
      documentId: supplierInvoices.documentId,
      invoiceNumber: supplierInvoices.invoiceNumber,
      levfakturaNumber: supplierInvoices.levfakturaNumber,
      supplierName: supplierInvoices.supplierName,
      totalOre: supplierInvoices.totalOre,
      invoiceDate: supplierInvoices.invoiceDate,
      dueDate: supplierInvoices.dueDate,
      paymentDate: supplierInvoices.paymentDate,
      status: supplierInvoices.status,
      bookedInK: supplierInvoices.bookedInK,
      bookedInA: supplierInvoices.bookedInA,
    })
    .from(supplierInvoices)
    .where(eq(supplierInvoices.companyId, id))
    .orderBy(asc(supplierInvoices.levfakturaNumber));

  return (
    <main className="w-full flex-1">
      <SupplierInvoiceTable companyId={id} rows={rows} />
    </main>
  );
}
