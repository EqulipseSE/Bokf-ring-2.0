import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import { accounts, voucherLines, vouchers } from "@/lib/db/schema";
import {
  yearStartIso,
  type AccountMovement,
} from "@/lib/financial-reports";
import type { VatPeriod } from "@/lib/vat-declaration";

export type FinancialReportSource = {
  accounts: AccountMovement[];
  periodVoucherCount: number;
  openingVoucherCount: number;
};

export async function getFinancialReportSource(
  companyId: string,
  period: VatPeriod
): Promise<FinancialReportSource> {
  await ensureCompanyBooks(companyId);
  const yearStart = yearStartIso(period.year);

  const [rows, periodCount, openingCount] = await Promise.all([
    db
      .select({
        number: accounts.number,
        name: accounts.name,
        openingOre: sql<number>`coalesce(sum(case
          when ${vouchers.isOpening} or ${vouchers.date} < ${period.from}
          then ${voucherLines.debit} - ${voucherLines.credit}
          else 0 end), 0)`,
        periodOre: sql<number>`coalesce(sum(case
          when ${vouchers.isOpening} = false
            and ${vouchers.date} >= ${period.from}
            and ${vouchers.date} <= ${period.to}
          then ${voucherLines.debit} - ${voucherLines.credit}
          else 0 end), 0)`,
        closingOre: sql<number>`coalesce(sum(case
          when ${vouchers.isOpening} or ${vouchers.date} <= ${period.to}
          then ${voucherLines.debit} - ${voucherLines.credit}
          else 0 end), 0)`,
        ytdOre: sql<number>`coalesce(sum(case
          when ${vouchers.isOpening}
            or (${vouchers.date} >= ${yearStart} and ${vouchers.date} <= ${period.to})
          then ${voucherLines.debit} - ${voucherLines.credit}
          else 0 end), 0)`,
      })
      .from(voucherLines)
      .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
      .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
      .where(eq(vouchers.companyId, companyId))
      .groupBy(accounts.id, accounts.number, accounts.name)
      .orderBy(accounts.number),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(vouchers)
      .where(
        and(
          eq(vouchers.companyId, companyId),
          eq(vouchers.isOpening, false),
          gte(vouchers.date, period.from),
          lte(vouchers.date, period.to)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(vouchers)
      .where(
        and(eq(vouchers.companyId, companyId), eq(vouchers.isOpening, true))
      ),
  ]);

  return {
    accounts: rows.map((row) => ({
      number: row.number,
      name: row.name,
      openingOre: Number(row.openingOre),
      periodOre: Number(row.periodOre),
      closingOre: Number(row.closingOre),
      ytdOre: Number(row.ytdOre),
    })),
    periodVoucherCount: Number(periodCount[0]?.n ?? 0),
    openingVoucherCount: Number(openingCount[0]?.n ?? 0),
  };
}
