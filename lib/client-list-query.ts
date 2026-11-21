import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import {
  CLIENT_STATUS_PLACEHOLDER,
  formatClientLatestDate,
  latestVoucherByCompany,
  type ClientListRow,
} from "@/lib/client-list";
import { db } from "@/lib/db";
import { connectedCompanyIds } from "@/lib/bank-sync";
import { companies, voucherSeries, vouchers } from "@/lib/db/schema";

export type { ClientListRow };

export async function listClientRows(): Promise<ClientListRow[]> {
  const [rows, voucherRows, linkedIds] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.name)),
    db
      .select({
        companyId: vouchers.companyId,
        number: vouchers.number,
        date: vouchers.date,
        series: voucherSeries.letter,
      })
      .from(vouchers)
      .innerJoin(voucherSeries, eq(vouchers.seriesId, voucherSeries.id))
      .where(and(eq(vouchers.isOpening, false), inArray(voucherSeries.letter, ["A", "B"]))),
    connectedCompanyIds(),
  ]);

  const latest = latestVoucherByCompany(voucherRows);

  return rows.map((company) => ({
    id: company.id,
    name: company.name,
    orgNumber: company.orgNumber,
    accountingMethod: company.accountingMethod,
    latestVoucherDate: formatClientLatestDate(latest.get(company.id)?.date),
    status: CLIENT_STATUS_PLACEHOLDER,
    bankLinked: linkedIds.has(company.id),
  }));
}
