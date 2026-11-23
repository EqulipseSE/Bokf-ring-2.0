import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { voucherSeries } from "@/lib/db/schema";
import { listCompanyAccounts } from "@/lib/vouchers";
import { AnalysisForm } from "./analysis-form";

export const metadata: Metadata = { title: "Kontoanalys" };

export default async function KontoanalysPage({
  params,
}: PageProps<"/foretag/[id]/kontoanalys">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();
  const [accounts, series] = await Promise.all([
    listCompanyAccounts(company.id),
    db
      .select({
        id: voucherSeries.id,
        letter: voucherSeries.letter,
        description: voucherSeries.description,
      })
      .from(voucherSeries)
      .where(eq(voucherSeries.companyId, company.id))
      .orderBy(asc(voucherSeries.letter)),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900">Kontoanalys</h1>
      <AnalysisForm companyId={company.id} accounts={accounts} series={series} />
    </main>
  );
}
