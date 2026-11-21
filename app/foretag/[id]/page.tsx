import {
  accountingMethodLabel,
  legalFormLabel,
  vatPeriodLabel,
} from "@/lib/company-settings";
import { getCompany } from "@/lib/company";

export default async function ForetagPage({
  params,
}: PageProps<"/foretag/[id]">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) return null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        {company.name}
      </h1>
      <p className="mt-1 text-sm tabular-nums text-neutral-500">
        {company.orgNumber}
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Bolagsform
          </dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {legalFormLabel(company.legalForm)}
          </dd>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Redovisningsmetod
          </dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {accountingMethodLabel(company.accountingMethod)}
          </dd>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Momsperiod
          </dt>
          <dd className="mt-1 font-medium text-neutral-900">
            {vatPeriodLabel(company.vatPeriod)}
          </dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-neutral-500">
        Välj ett alternativ i menyn. Innehållet kommer i nästa steg.
      </p>
    </main>
  );
}
