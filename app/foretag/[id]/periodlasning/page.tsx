import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";
import { getPeriodLockView } from "@/lib/period-lock-query";
import { PeriodLockView } from "./lock-view";

export const metadata: Metadata = {
  title: "Periodlåsning",
};

export default async function PeriodlasningPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/periodlasning">) {
  const { id } = await params;
  const query = await searchParams;
  const company = await getCompany(id);
  if (!company) notFound();

  const view = await getPeriodLockView(company.id, query.ar);

  return (
    <PeriodLockView
      companyId={company.id}
      companyName={company.name}
      orgNumber={company.orgNumber}
      view={view}
    />
  );
}
