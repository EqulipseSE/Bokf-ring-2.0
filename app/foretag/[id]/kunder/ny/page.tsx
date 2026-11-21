import type { Metadata } from "next";
import { listCompanyChart } from "@/lib/company";
import { CustomerForm } from "./customer-form";

export const metadata: Metadata = { title: "Ny kund" };

export default async function NyKundPage({
  params,
}: PageProps<"/foretag/[id]/kunder/ny">) {
  const { id } = await params;
  const chart = await listCompanyChart(id);

  return (
    <main className="w-full flex-1 px-6 py-6">
      <CustomerForm
        companyId={id}
        accounts={chart
          .filter((account) => account.active)
          .map((account) => ({ number: account.number, name: account.name }))}
      />
    </main>
  );
}
