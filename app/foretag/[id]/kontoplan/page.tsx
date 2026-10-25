import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany, listCompanyChart } from "@/lib/company";
import { getAccountBalances, getOpeningBalances, listCompanyAccounts } from "@/lib/vouchers";
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

  const [accounts, opening, closing, searchable] = await Promise.all([
    listCompanyChart(id),
    getOpeningBalances(id),
    getAccountBalances(id),
    listCompanyAccounts(id),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Kontoplan
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Företagets konton. Avmarkera konton du inte vill se vid kontering.
        Välj momskod per konto — den följer med vid kontering. Klicka på ett
        saldo för att ändra; skillnaden bokförs mot ett motkonto.
      </p>
      <div className="mt-8">
        <AccountChart
          companyId={company.id}
          searchableAccounts={searchable}
          accounts={accounts.map((account) => ({
            id: account.id,
            number: account.number,
            name: account.name,
            vatCode: account.vatCode,
            active: account.active,
            openingOre: opening[account.id] ?? 0,
            closingOre: closing[account.id] ?? 0,
          }))}
        />
      </div>
    </main>
  );
}
