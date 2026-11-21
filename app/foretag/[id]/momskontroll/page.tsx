import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { parseVatPeriodKind } from "@/lib/company-settings";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { vouchers } from "@/lib/db/schema";
import { firstOpenVatPeriod } from "@/lib/vat-declaration";
import { VatControl } from "./vat-control";

export const metadata: Metadata = { title: "Momskontroll" };

export default async function MomskontrollPage({
  params,
}: PageProps<"/foretag/[id]/momskontroll">) {
  const { id } = await params;
  const company = await getCompany(id);
  const kind = parseVatPeriodKind(company?.vatPeriod ?? "manad");
  const earliest = company
    ? await db
        .select({ date: vouchers.date })
        .from(vouchers)
        .where(and(eq(vouchers.companyId, company.id), eq(vouchers.isOpening, false)))
        .orderBy(asc(vouchers.date))
        .limit(1)
    : [];
  const period = firstOpenVatPeriod(
    kind.ok ? kind.value : "manad",
    earliest[0]?.date ?? ""
  );
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900">Momskontroll</h1>
      <VatControl companyId={id} suggestedFrom={period?.from ?? ""} suggestedTo={period?.to ?? ""} />
    </main>
  );
}
