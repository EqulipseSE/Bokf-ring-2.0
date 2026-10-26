import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import {
  clientLatestVoucherLabel,
  formatClientLatest,
  latestVoucherByCompany,
} from "@/lib/client-list";
import { db } from "@/lib/db";
import { companies, voucherSeries, vouchers } from "@/lib/db/schema";

export type ClientListRow = {
  id: string;
  name: string;
  orgNumber: string;
  accountingMethod: string;
  latestVoucherNumber: string;
  latestVoucherDate: string;
};

export async function listClientRows(): Promise<ClientListRow[]> {
  const [rows, voucherRows, seriesCounts] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.name)),
    db
      .select({
        companyId: vouchers.companyId,
        letter: voucherSeries.letter,
        number: vouchers.number,
        date: vouchers.date,
      })
      .from(vouchers)
      .innerJoin(voucherSeries, eq(vouchers.seriesId, voucherSeries.id))
      .where(eq(vouchers.isOpening, false)),
    db
      .select({
        companyId: voucherSeries.companyId,
        n: sql<number>`count(*)::int`,
      })
      .from(voucherSeries)
      .groupBy(voucherSeries.companyId),
  ]);

  const latest = latestVoucherByCompany(voucherRows);
  const seriesCountByCompany = new Map<string, number>();
  for (const row of seriesCounts) {
    seriesCountByCompany.set(row.companyId, Number(row.n));
  }

  return rows.map((company) => {
    const hint = latest.get(company.id);
    const formatted = formatClientLatest(
      clientLatestVoucherLabel(hint, seriesCountByCompany.get(company.id) ?? 1),
      hint?.date
    );
    return {
      id: company.id,
      name: company.name,
      orgNumber: company.orgNumber,
      accountingMethod: company.accountingMethod,
      latestVoucherNumber: formatted.number,
      latestVoucherDate: formatted.date,
    };
  });
}
