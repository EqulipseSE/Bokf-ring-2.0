import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  parseAccountingMethod,
  parseVatPeriodKind,
} from "@/lib/company-settings";
import { getCompany } from "@/lib/company";
import { listResultUnits } from "@/lib/result-units";
import { listWriteOffs } from "@/lib/write-offs";
import { CompanySettingsForm } from "./settings-form";
import { ResultUnitsPanel } from "./result-units-panel";
import { parseSettingsSelection } from "./settings-nav";
import { SettingsPlaceholder } from "./settings-placeholder";
import { SettingsTabs } from "./settings-tabs";
import { WriteOffsPanel } from "./write-offs-panel";

export const metadata: Metadata = {
  title: "Företagsinställningar",
};

export default async function ForetagsinstallningarPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/foretagsinstallningar">) {
  const { id } = await params;
  const query = await searchParams;
  const company = await getCompany(id);
  if (!company) notFound();

  const selection = parseSettingsSelection(query);
  const vatPeriod = parseVatPeriodKind(company.vatPeriod);
  const accountingMethod = parseAccountingMethod(company.accountingMethod);
  const writeOffRows =
    selection.under === "bortskrivningar"
      ? await listWriteOffs(company.id)
      : [];
  const resultUnitRows =
    selection.under === "resultatenheter"
      ? await listResultUnits(company.id)
      : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Företagsinställningar
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Momsperiod styr periodlåsningen. Redovisningsmetoden sparas så att
        AI-bokföring kan använda den senare.
      </p>

      <SettingsTabs
        companyId={company.id}
        flik={selection.flik}
        under={selection.under}
      />

      {selection.under === "uppgifter" ? (
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
      ) : selection.under === "bortskrivningar" ? (
        <WriteOffsPanel companyId={company.id} rows={writeOffRows} />
      ) : selection.under === "resultatenheter" ? (
        <ResultUnitsPanel companyId={company.id} rows={resultUnitRows} />
      ) : (
        <SettingsPlaceholder title={selection.label} />
      )}
    </main>
  );
}
