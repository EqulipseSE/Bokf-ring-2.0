import type { Metadata } from "next";
import { listArticles } from "@/lib/articles";
import { listCustomers } from "@/lib/customers";
import { listCompanyChart } from "@/lib/company";
import { InvoiceHeader } from "./invoice-header";

export const metadata: Metadata = { title: "Ny kundfaktura" };

export default async function NyKundfakturaPage({
  params,
}: PageProps<"/foretag/[id]/kundfakturor/ny">) {
  const { id } = await params;
  const [articles, chart, customerRows] = await Promise.all([
    listArticles(id),
    listCompanyChart(id),
    listCustomers(id),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <InvoiceHeader
        articles={articles.map((article) => ({
          id: article.id,
          number: article.number,
          name: article.name,
          unit: article.unit ?? "",
          unitPrice: article.unitPrice ?? "",
          accountNumber: article.accountNumber ?? "",
          vatCode: article.vatCode ?? "",
        }))}
        companyId={id}
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
      />
    </main>
  );
}
