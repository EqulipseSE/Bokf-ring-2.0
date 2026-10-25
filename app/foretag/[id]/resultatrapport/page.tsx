import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";
import { buildIncomeReport } from "@/lib/financial-reports";
import { getFinancialReportSource } from "@/lib/financial-reports-query";
import { availableYears, parseVatPeriod } from "@/lib/vat-declaration";
import { listVoucherYears } from "@/lib/vat-declaration-query";
import { todayIsoDate } from "@/lib/voucher-date";
import { companyHref } from "../menu";
import { IncomeView } from "./income-view";

export const metadata: Metadata = {
  title: "Resultatrapport",
};

export default async function ResultatrapportPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/resultatrapport">) {
  const { id } = await params;
  const query = await searchParams;
  const company = await getCompany(id);
  if (!company) notFound();

  const today = todayIsoDate();
  const period = parseVatPeriod(query, today);
  const [source, voucherYears] = await Promise.all([
    getFinancialReportSource(company.id, period),
    listVoucherYears(company.id),
  ]);

  return (
    <IncomeView
      companyName={company.name}
      orgNumber={company.orgNumber}
      period={period}
      report={buildIncomeReport(source.accounts)}
      periodVoucherCount={source.periodVoucherCount}
      openingVoucherCount={source.openingVoucherCount}
      action={companyHref(company.id, "resultatrapport")}
      years={availableYears(today, voucherYears)}
    />
  );
}
