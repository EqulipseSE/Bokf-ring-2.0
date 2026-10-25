import "server-only";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { DEFAULT_SERIES_LETTER } from "@/lib/db/bas-accounts";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import { voucherNumberLabel } from "@/lib/money";
import {
  accounts,
  users,
  voucherAttachments,
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
  letter: string;
  number: number;
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
    accountId: string;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
    text: string | null;
  }[];
  debitOre: number;
  creditOre: number;
  attachment: {
    originalName: string;
    mimeType: string;
  } | null;
};

export async function countCompanySeries(companyId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(voucherSeries)
    .where(eq(voucherSeries.companyId, companyId));
  return Number(row?.n ?? 0);
}

export async function peekNextVoucherLabel(companyId: string): Promise<string> {
  await ensureCompanyBooks(companyId);
  const seriesCount = await countCompanySeries(companyId);
  const [series] = await db
    .select({
      letter: voucherSeries.letter,
      nextNumber: voucherSeries.nextNumber,
    })
    .from(voucherSeries)
    .where(
      and(
        eq(voucherSeries.companyId, companyId),
        eq(voucherSeries.letter, DEFAULT_SERIES_LETTER)
      )
    )
    .limit(1);
  if (!series) return voucherNumberLabel(DEFAULT_SERIES_LETTER, 1, seriesCount);
  return voucherNumberLabel(series.letter, series.nextNumber, seriesCount);
}

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
    .orderBy(asc(voucherSeries.letter), asc(vouchers.number));

  const seriesCount = await countCompanySeries(companyId);
  return rows.map((row) => ({
    id: row.id,
    letter: row.letter,
    number: row.number,
    numberLabel: voucherNumberLabel(row.letter, row.number, seriesCount),
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

  const [attachment] = await db
    .select({
      originalName: voucherAttachments.originalName,
      mimeType: voucherAttachments.mimeType,
    })
    .from(voucherAttachments)
    .where(eq(voucherAttachments.voucherId, header.id))
    .limit(1);

  const lines = await db
    .select({
      lineNumber: voucherLines.lineNumber,
      accountId: voucherLines.accountId,
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

  const seriesCount = await countCompanySeries(companyId);
  return {
    id: header.id,
    numberLabel: voucherNumberLabel(header.letter, header.number, seriesCount),
    date: header.date,
    text: header.text,
    status: header.status,
    registeredAt: header.registeredAt,
    registeredByName: header.registeredByName,
    lines,
    debitOre,
    creditOre,
    attachment: attachment ?? null,
  };
}

/** Kontosaldo i öre från sparade verifikationer, ev. exklusive en pågående. */
export async function getAccountBalances(
  companyId: string,
  excludeVoucherId?: string
): Promise<Record<string, number>> {
  const rows = await db
    .select({
      accountId: voucherLines.accountId,
      saldoOre: sql<number>`coalesce(sum(${voucherLines.debit} - ${voucherLines.credit}), 0)`,
    })
    .from(voucherLines)
    .innerJoin(vouchers, eq(voucherLines.voucherId, vouchers.id))
    .where(
      excludeVoucherId
        ? and(eq(vouchers.companyId, companyId), ne(vouchers.id, excludeVoucherId))
        : eq(vouchers.companyId, companyId)
    )
    .groupBy(voucherLines.accountId);

  const balances: Record<string, number> = {};
  for (const row of rows) {
    balances[row.accountId] = Number(row.saldoOre);
  }
  return balances;
}
