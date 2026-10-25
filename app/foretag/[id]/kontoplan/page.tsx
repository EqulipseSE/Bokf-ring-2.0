import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany, listCompanyChart } from "@/lib/company";
import { AccountChart } from "./account-chart";

export const metadata: Metadata = {
  title: "Kontoplan",
};

export default async function KontoplanPage({
  params,
}: PageProps<"/foretag/[id]/kontoplan">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const accounts = await listCompanyChart(id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Kontoplan
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Företagets konton. Avaktiverade konton syns här men inte vid
        kontering.
      </p>
      <div className="mt-8">
        <AccountChart
          companyId={company.id}
          accounts={accounts.map((account) => ({
            id: account.id,
            number: account.number,
            name: account.name,
            active: account.active,
          }))}
        />
      </div>
    </main>
  );
}
