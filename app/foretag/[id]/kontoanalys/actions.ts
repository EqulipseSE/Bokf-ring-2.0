"use server";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { voucherLines, voucherSeries, vouchers } from "@/lib/db/schema";

export type AccountAnalysisRow = {
  id: string;
  date: string;
  label: string;
  text: string;
  debitOre: number;
  creditOre: number;
};

export async function loadAccountAnalysis(
  companyId: string,
  accountId: string,
  from: string,
  to: string,
  seriesIds: string[]
): Promise<{ ok: true; rows: AccountAnalysisRow[] } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return { ok: false, error: "Datumet ska vara från och till, med från först." };
  }
  if (seriesIds.length === 0) return { ok: false, error: "Välj minst en serie." };

  const rows = await db
    .select({
      id: voucherLines.id,
      date: vouchers.date,
      number: vouchers.number,
      text: vouchers.text,
      letter: voucherSeries.letter,
      debit: voucherLines.debit,
      credit: voucherLines.credit,
    })
    .from(voucherLines)
    .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
    .innerJoin(voucherSeries, eq(vouchers.seriesId, voucherSeries.id))
    .where(
      and(
        eq(vouchers.companyId, company.id),
        eq(voucherLines.accountId, accountId),
        gte(vouchers.date, from),
        lte(vouchers.date, to),
        inArray(vouchers.seriesId, seriesIds)
      )
    )
    .orderBy(asc(vouchers.date), asc(voucherSeries.letter), asc(vouchers.number));

  return {
    ok: true,
    rows: rows.map((row) => ({
      id: row.id,
      date: row.date,
      label: `${row.letter}${row.number}`,
      text: row.text,
      debitOre: row.debit,
      creditOre: row.credit,
    })),
  };
}
