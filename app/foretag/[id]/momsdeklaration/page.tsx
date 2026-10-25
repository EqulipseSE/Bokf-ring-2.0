import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";
import {
  availableYears,
  parseVatPeriod,
} from "@/lib/vat-declaration";
import {
  getVatDeclaration,
  listVoucherYears,
} from "@/lib/vat-declaration-query";
import { todayIsoDate } from "@/lib/voucher-date";
import { companyHref } from "../menu";
import { DeclarationView } from "./declaration-view";

export const metadata: Metadata = {
  title: "Momsdeklaration",
};

export default async function MomsdeklarationPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/momsdeklaration">) {
  const { id } = await params;
  const query = await searchParams;
  const company = await getCompany(id);
  if (!company) notFound();

  const today = todayIsoDate();
  const period = parseVatPeriod(query, today);
  const [report, voucherYears] = await Promise.all([
    getVatDeclaration(company.id, period),
    listVoucherYears(company.id),
  ]);

  return (
    <DeclarationView
      companyName={company.name}
      orgNumber={company.orgNumber}
      period={period}
      boxes={report.boxes}
      lineCount={report.lineCount}
      voucherCount={report.voucherCount}
      action={companyHref(company.id, "momsdeklaration")}
      years={availableYears(today, voucherYears)}
    />
  );
}
