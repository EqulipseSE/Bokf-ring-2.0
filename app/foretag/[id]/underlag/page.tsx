import type { Metadata } from "next";
import { listBankAccounts, listBankStatement } from "@/lib/bank-statement";
import { AccountSwitch } from "./account-switch";
import { StatementList } from "./statement-list";

export const metadata: Metadata = {
  title: "Kontoutdrag",
};

export default async function KontoutdragPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/underlag">) {
  const { id } = await params;
  const query = await searchParams;
  const accounts = await listBankAccounts(id);
  const requested = typeof query.konto === "string" ? query.konto : "";
  const selected = accounts.some((account) => account.uid === requested)
    ? requested
    : accounts[0]?.uid;
  const rows = await listBankStatement(id, selected);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Kontoutdrag
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length === 0
              ? "Inga transaktioner hämtade."
              : `${rows.length} transaktioner, nyast överst.`}
          </p>
        </div>
        <AccountSwitch accounts={accounts} selectedUid={selected ?? ""} />
      </div>
      <StatementList companyId={id} rows={rows} />
    </main>
  );
}
