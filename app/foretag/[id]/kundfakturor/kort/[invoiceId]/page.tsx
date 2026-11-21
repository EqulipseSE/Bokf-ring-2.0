import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { listArticles } from "@/lib/articles";
import { listCompanyChart } from "@/lib/company";
import { listCustomers } from "@/lib/customers";
import { db } from "@/lib/db";
import { invoiceLines, invoices } from "@/lib/db/schema";
import { InvoiceHeader } from "../../ny/invoice-header";

export const metadata: Metadata = { title: "Kundfaktura" };

const TYPES = new Set(["faktura", "kvitto", "kreditfaktura", "avrakning"]);

export default async function CustomerInvoiceKortPage({
  params,
}: PageProps<"/foretag/[id]/kundfakturor/kort/[invoiceId]">) {
  const { id, invoiceId } = await params;
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.companyId, id), eq(invoices.id, invoiceId)))
    .limit(1);
  if (!invoice) notFound();

  const [articles, chart, customerRows, lines] = await Promise.all([
    listArticles(id),
    listCompanyChart(id),
    listCustomers(id),
    db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoice.id))
      .orderBy(invoiceLines.lineNumber),
  ]);

  const invoiceType = TYPES.has(invoice.invoiceType)
    ? (invoice.invoiceType as "faktura" | "kvitto" | "kreditfaktura" | "avrakning")
    : "faktura";

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <InvoiceHeader
        companyId={id}
        articles={articles.map((article) => ({
          id: article.id,
          number: article.number,
          name: article.name,
          unit: article.unit ?? "",
          unitPrice: article.unitPrice ?? "",
          accountNumber: article.accountNumber ?? "",
          vatCode: article.vatCode ?? "",
        }))}
        customers={customerRows.map((customer) => ({
          id: customer.id,
          number: customer.number,
          name: customer.name,
        }))}
        accountNumbers={chart.map((account) => account.number)}
        accounts={chart
          .filter((account) => account.active && account.number.startsWith("3"))
          .map((account) => ({
            id: account.id,
            number: account.number,
            name: account.name,
            vatCode: account.vatCode,
          }))}
        initial={{
          invoiceId: invoice.id,
          number: invoice.number,
          invoiceType,
          customerId: invoice.customerId ?? "",
          customerNumber: invoice.customerNumber ?? "",
          customerName: invoice.customerName,
          reference: invoice.reference ?? "",
          invoiceDate: invoice.invoiceDate ?? "",
          paymentDays: invoice.paymentDays ?? 30,
          dueDate: invoice.dueDate ?? "",
          purchaseDate: invoice.purchaseDate ?? "",
          ownComment: invoice.ownComment ?? "",
          invoiceComment: invoice.invoiceComment ?? "",
          pricesIncludeVat: invoice.pricesIncludeVat,
          freight: invoice.freight ?? "0",
          invoiceFee: invoice.invoiceFee ?? "0",
          currency: invoice.currency,
          paymentDate: invoice.paymentDate ?? "",
          lines: lines.map((line) => ({
            articleId: line.articleId ?? "",
            number: line.articleNumber ?? "",
            name: line.name ?? "",
            unitPrice: line.unitPrice ?? "",
            quantity: line.quantity ?? "",
            vatCode: line.vatCode ?? "",
            accountNumber: line.accountNumber ?? "",
          })),
        }}
      />
    </main>
  );
}
