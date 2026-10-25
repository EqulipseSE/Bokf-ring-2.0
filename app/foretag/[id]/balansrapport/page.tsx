import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";
import { buildBalanceReport } from "@/lib/financial-reports";
import { getFinancialReportSource } from "@/lib/financial-reports-query";
import { availableYears, parseVatPeriod } from "@/lib/vat-declaration";
import { listVoucherYears } from "@/lib/vat-declaration-query";
import { todayIsoDate } from "@/lib/voucher-date";
import { companyHref } from "../menu";
import { BalanceView } from "./balance-view";

export const metadata: Metadata = {
  title: "Balansrapport",
};

export default async function BalansrapportPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/balansrapport">) {
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
    <BalanceView
      companyName={company.name}
      orgNumber={company.orgNumber}
      period={period}
      report={buildBalanceReport(source.accounts)}
      periodVoucherCount={source.periodVoucherCount}
      openingVoucherCount={source.openingVoucherCount}
      action={companyHref(company.id, "balansrapport")}
      years={availableYears(today, voucherYears)}
    />
  );
}
