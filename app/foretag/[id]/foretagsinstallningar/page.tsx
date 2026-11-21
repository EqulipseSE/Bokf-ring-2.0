import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  parseAccountingMethod,
  parseVatPeriodKind,
} from "@/lib/company-settings";
import { getCompany } from "@/lib/company";
import { CompanySettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Företagsinställningar",
};

export default async function ForetagsinstallningarPage({
  params,
}: PageProps<"/foretag/[id]/foretagsinstallningar">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const vatPeriod = parseVatPeriodKind(company.vatPeriod);
  const accountingMethod = parseAccountingMethod(company.accountingMethod);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Företagsinställningar
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Momsperiod styr periodlåsningen. Redovisningsmetoden sparas så att
        AI-bokföring kan använda den senare.
      </p>

      <CompanySettingsForm
        companyId={company.id}
        name={company.name}
        orgNumber={company.orgNumber}
        bankgiro={company.bankgiro ?? ""}
        plusgiro={company.plusgiro ?? ""}
        vatPeriod={vatPeriod.ok ? vatPeriod.value : "manad"}
        accountingMethod={
          accountingMethod.ok ? accountingMethod.value : "faktura"
        }
      />
    </main>
  );
}
