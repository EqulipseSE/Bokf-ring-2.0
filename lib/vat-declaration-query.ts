import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import { accounts, voucherLines, vouchers } from "@/lib/db/schema";
import {
  sumVatBoxes,
  type VatBoxId,
  type VatDeclarationLine,
  type VatPeriod,
} from "@/lib/vat-declaration";

export type VatDeclarationReport = {
  boxes: Record<VatBoxId, number>;
  lineCount: number;
  voucherCount: number;
};

export async function getVatDeclaration(
  companyId: string,
  period: VatPeriod
): Promise<VatDeclarationReport> {
  await ensureCompanyBooks(companyId);

  const rows = await db
    .select({
      vatCode: voucherLines.vatCode,
      accountNumber: accounts.number,
      debit: voucherLines.debit,
      credit: voucherLines.credit,
      voucherId: vouchers.id,
    })
    .from(voucherLines)
    .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
    .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
    .where(
      and(
        eq(vouchers.companyId, companyId),
        eq(vouchers.isOpening, false),
        gte(vouchers.date, period.from),
        lte(vouchers.date, period.to)
      )
    );

  const lines: VatDeclarationLine[] = rows.map((row) => ({
    vatCode: row.vatCode,
    accountNumber: row.accountNumber,
    debit: Number(row.debit),
    credit: Number(row.credit),
  }));

  return {
    boxes: sumVatBoxes(lines),
    lineCount: lines.length,
    voucherCount: new Set(rows.map((row) => row.voucherId)).size,
  };
}

/** Tidigaste och senaste verifikationsår, för periodväljaren. */
export async function listVoucherYears(companyId: string): Promise<number[]> {
  const [row] = await db
    .select({
      minYear: sql<number | null>`min(extract(year from ${vouchers.date}))`,
      maxYear: sql<number | null>`max(extract(year from ${vouchers.date}))`,
    })
    .from(vouchers)
    .where(
      and(eq(vouchers.companyId, companyId), eq(vouchers.isOpening, false))
    );

  const years: number[] = [];
  const minYear = row?.minYear == null ? null : Number(row.minYear);
  const maxYear = row?.maxYear == null ? null : Number(row.maxYear);
  if (minYear != null && maxYear != null) {
    years.push(minYear, maxYear);
  }
  return years;
}
