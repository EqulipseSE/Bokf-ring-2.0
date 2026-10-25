import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import {
  accounts,
  users,
  voucherLines,
  voucherSeries,
  vouchers,
  type Account,
} from "@/lib/db/schema";

export const LAST_VOUCHER_DATE_COOKIE = "omnio_last_voucher_date";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VoucherListItem = {
  id: string;
  numberLabel: string;
  date: string;
  text: string;
  amountOre: number;
};

export type VoucherDetail = {
  id: string;
  numberLabel: string;
  date: string;
  text: string;
  status: string;
  registeredAt: Date;
  registeredByName: string;
  lines: {
    lineNumber: number;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
    text: string | null;
  }[];
  debitOre: number;
  creditOre: number;
};

export async function listCompanyAccounts(
  companyId: string
): Promise<Account[]> {
  await ensureCompanyBooks(companyId);
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.companyId, companyId), eq(accounts.active, true)))
    .orderBy(accounts.number);
}

export async function listVouchers(
  companyId: string
): Promise<VoucherListItem[]> {
  await ensureCompanyBooks(companyId);
  const rows = await db
    .select({
      id: vouchers.id,
      number: vouchers.number,
      date: vouchers.date,
      text: vouchers.text,
      letter: voucherSeries.letter,
      amountOre: sql<number>`coalesce((
        select sum(${voucherLines.debit})
        from ${voucherLines}
        where ${voucherLines.voucherId} = ${vouchers.id}
      ), 0)`,
    })
    .from(vouchers)
    .innerJoin(voucherSeries, eq(vouchers.seriesId, voucherSeries.id))
    .where(eq(vouchers.companyId, companyId))
    .orderBy(desc(vouchers.registeredAt), desc(vouchers.number));

  return rows.map((row) => ({
    id: row.id,
    numberLabel: `${row.letter}${row.number}`,
    date: row.date,
    text: row.text,
    amountOre: Number(row.amountOre),
  }));
}

export async function getVoucher(
  companyId: string,
  voucherId: string
): Promise<VoucherDetail | null> {
  if (!UUID_REGEX.test(voucherId)) return null;

  const [header] = await db
    .select({
      id: vouchers.id,
      number: vouchers.number,
      date: vouchers.date,
      text: vouchers.text,
      status: vouchers.status,
      registeredAt: vouchers.registeredAt,
      letter: voucherSeries.letter,
      registeredByName: users.name,
    })
    .from(vouchers)
    .innerJoin(voucherSeries, eq(vouchers.seriesId, voucherSeries.id))
    .innerJoin(users, eq(vouchers.registeredBy, users.id))
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.companyId, companyId)))
    .limit(1);

  if (!header) return null;

  const lines = await db
    .select({
      lineNumber: voucherLines.lineNumber,
      accountNumber: accounts.number,
      accountName: accounts.name,
      debit: voucherLines.debit,
      credit: voucherLines.credit,
      text: voucherLines.text,
    })
    .from(voucherLines)
    .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
    .where(eq(voucherLines.voucherId, header.id))
    .orderBy(voucherLines.lineNumber);

  const debitOre = lines.reduce((sum, line) => sum + line.debit, 0);
  const creditOre = lines.reduce((sum, line) => sum + line.credit, 0);

  return {
    id: header.id,
    numberLabel: `${header.letter}${header.number}`,
    date: header.date,
    text: header.text,
    status: header.status,
    registeredAt: header.registeredAt,
    registeredByName: header.registeredByName,
    lines,
    debitOre,
    creditOre,
  };
}
