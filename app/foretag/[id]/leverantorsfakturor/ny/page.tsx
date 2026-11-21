import type { Metadata } from "next";
import { listCompanyChart } from "@/lib/company";
import { listSuppliers } from "@/lib/suppliers";
import { SupplierInvoiceForm } from "./supplier-invoice-form";

export const metadata: Metadata = { title: "Ny leverantörsfaktura" };

export default async function NyLeverantorsfakturaPage({
  params,
}: PageProps<"/foretag/[id]/leverantorsfakturor/ny">) {
  const { id } = await params;
  const [suppliers, accounts] = await Promise.all([listSuppliers(id), listCompanyChart(id)]);

  return (
    <main className="w-full flex-1">
      <SupplierInvoiceForm
        companyId={id}
        suppliers={suppliers}
        accounts={accounts.filter((account) => account.active)}
      />
    </main>
  );
}
