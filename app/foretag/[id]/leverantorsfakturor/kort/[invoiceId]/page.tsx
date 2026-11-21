import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { listCompanyChart } from "@/lib/company";
import { db } from "@/lib/db";
import { accounts, companyDocuments, supplierInvoiceLines, supplierInvoices } from "@/lib/db/schema";
import { ensureInvoiceSupplier } from "@/lib/ensure-supplier";
import { formatOreInput } from "@/lib/money";
import { listSuppliers } from "@/lib/suppliers";
import { UnderlagPreview } from "../../../verifikationer/underlag-preview";
import { SupplierInvoiceForm } from "../../ny/supplier-invoice-form";

export const metadata: Metadata = { title: "Leverantörsfaktura" };

export default async function SupplierInvoiceKortPage({
  params,
}: PageProps<"/foretag/[id]/leverantorsfakturor/kort/[invoiceId]">) {
  const { id, invoiceId } = await params;
  const [invoice] = await db
    .select()
    .from(supplierInvoices)
    .where(and(eq(supplierInvoices.companyId, id), eq(supplierInvoices.id, invoiceId)))
    .limit(1);
  if (!invoice) notFound();

  const storedLines = await db
    .select({
      accountId: supplierInvoiceLines.accountId,
      accountNumber: supplierInvoiceLines.accountNumber,
      accountName: accounts.name,
      debitOre: supplierInvoiceLines.debitOre,
      creditOre: supplierInvoiceLines.creditOre,
    })
    .from(supplierInvoiceLines)
    .leftJoin(accounts, eq(supplierInvoiceLines.accountId, accounts.id))
    .where(eq(supplierInvoiceLines.invoiceId, invoice.id))
    .orderBy(supplierInvoiceLines.lineNumber);

  const costAccount =
    storedLines.find((line) => !["2641", "2440", "0"].includes(line.accountNumber))?.accountNumber ?? "0";
  const supplier = await ensureInvoiceSupplier(id, invoice.id, invoice.supplierName, costAccount);
  const [suppliers, chart] = await Promise.all([listSuppliers(id), listCompanyChart(id)]);

  const lines = storedLines.map((line) => ({
    key: crypto.randomUUID(),
    accountId: line.accountId ?? "",
    accountNumber: line.accountNumber,
    accountName: line.accountName ?? "",
    debit: line.debitOre > 0 ? formatOreInput(line.debitOre) : "",
    credit: line.creditOre > 0 ? formatOreInput(line.creditOre) : "",
  }));
  while (lines.length < 8) {
    lines.push({
      key: crypto.randomUUID(),
      accountId: "",
      accountNumber: "",
      accountName: "",
      debit: "",
      credit: "",
    });
  }

  const [document] = invoice.documentId
    ? await db
        .select({
          mimeType: companyDocuments.mimeType,
          fileName: companyDocuments.originalName,
        })
        .from(companyDocuments)
        .where(eq(companyDocuments.id, invoice.documentId))
        .limit(1)
    : [];

  return (
    <main className="grid w-full flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <SupplierInvoiceForm
        companyId={id}
        suppliers={suppliers}
        accounts={chart.filter((account) => account.active)}
        initial={{
          invoiceId: invoice.id,
          levfakturaNumber: invoice.levfakturaNumber,
          supplierId: supplier?.id ?? invoice.supplierId ?? "",
          supplierNumber: (supplier?.number ?? invoice.supplierNumber ?? "").padStart(3, "0"),
          supplierName: supplier?.name ?? invoice.supplierName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate ?? "",
          dueDate: invoice.dueDate ?? "",
          paymentDate: invoice.paymentDate ?? "",
          total: formatOreInput(invoice.totalOre),
          vat: formatOreInput(invoice.vatOre),
          freight: formatOreInput(invoice.freightOre),
          lines,
          status: invoice.status,
          bookedInK: invoice.bookedInK,
          bookedInA: invoice.bookedInA,
        }}
      />
      <div className="w-full max-w-[26rem] p-3">
        {invoice.documentId ? (
          <UnderlagPreview
            src={`/foretag/${id}/underlag/fil/${invoice.documentId}`}
            mimeType={document?.mimeType ?? "application/pdf"}
            fileName={document?.fileName ?? "Underlag"}
            compact
          />
        ) : (
          <p className="px-4 py-8 text-sm text-neutral-500">Inget underlag är kopplat.</p>
        )}
      </div>
    </main>
  );
}
