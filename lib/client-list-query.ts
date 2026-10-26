import "server-only";

import { asc, eq } from "drizzle-orm";
import {
  formatClientLatestDate,
  latestVoucherByCompany,
} from "@/lib/client-list";
import { db } from "@/lib/db";
import { companies, vouchers } from "@/lib/db/schema";

export type ClientListRow = {
  id: string;
  name: string;
  orgNumber: string;
  accountingMethod: string;
  latestVoucherDate: string;
};

export async function listClientRows(): Promise<ClientListRow[]> {
  const [rows, voucherRows] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.name)),
    db
      .select({
        companyId: vouchers.companyId,
        number: vouchers.number,
        date: vouchers.date,
      })
      .from(vouchers)
      .where(eq(vouchers.isOpening, false)),
  ]);

  const latest = latestVoucherByCompany(voucherRows);

  return rows.map((company) => ({
    id: company.id,
    name: company.name,
    orgNumber: company.orgNumber,
    accountingMethod: company.accountingMethod,
    latestVoucherDate: formatClientLatestDate(latest.get(company.id)?.date),
  }));
}
