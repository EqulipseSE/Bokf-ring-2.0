"use server";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { accounts, voucherLines, voucherSeries, vouchers } from "@/lib/db/schema";
import { outgoingVatReview, type VatCheckLine } from "@/lib/vat-check";

export type VatControlVoucher = {
  id: string;
  label: string;
  date: string;
  text: string;
  expectedOre: number;
  reportedOre: number;
};

export type VatControlResult = {
  from: string;
  to: string;
  turnoverOre: number;
  expectedOre: number;
  reportedOre: number;
  mismatches: VatControlVoucher[];
};

export async function loadVatControl(
  companyId: string,
  from: string,
  to: string
): Promise<{ ok: true; result: VatControlResult } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return { ok: false, error: "Datumet ska vara från och till, med från först." };
  }

  const rows = await db
    .select({
      voucherId: vouchers.id,
      number: vouchers.number,
      date: vouchers.date,
      text: vouchers.text,
      letter: voucherSeries.letter,
      accountNumber: accounts.number,
      accountName: accounts.name,
      vatCode: voucherLines.vatCode,
      debit: voucherLines.debit,
      credit: voucherLines.credit,
    })
    .from(vouchers)
    .innerJoin(voucherSeries, eq(vouchers.seriesId, voucherSeries.id))
    .innerJoin(voucherLines, eq(voucherLines.voucherId, vouchers.id))
    .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
    .where(
      and(
        eq(vouchers.companyId, company.id),
        eq(vouchers.isOpening, false),
        gte(vouchers.date, from),
        lte(vouchers.date, to)
      )
    )
    .orderBy(asc(vouchers.date), asc(voucherSeries.letter), asc(vouchers.number));

  const grouped = new Map<
    string,
    { label: string; date: string; text: string; lines: VatCheckLine[] }
  >();
  for (const row of rows) {
    const current = grouped.get(row.voucherId) ?? {
      label: `${row.letter}${row.number}`,
      date: row.date,
      text: row.text,
      lines: [],
    };
    current.lines.push({
      accountNumber: row.accountNumber,
      accountName: row.accountName,
      vatCode: row.vatCode,
      debitOre: row.debit,
      creditOre: row.credit,
    });
    grouped.set(row.voucherId, current);
  }

  let turnoverOre = 0;
  let expectedOre = 0;
  let reportedOre = 0;
  const mismatches: VatControlVoucher[] = [];
  for (const [id, voucher] of grouped) {
    const review = outgoingVatReview(voucher.lines);
    turnoverOre += review.turnoverOre;
    expectedOre += review.expectedOre;
    reportedOre += review.reportedOre;
    if (review.mismatch) {
      mismatches.push({
        id,
        label: voucher.label,
        date: voucher.date,
        text: voucher.text,
        expectedOre: review.expectedOre,
        reportedOre: review.reportedOre,
      });
    }
  }

  return {
    ok: true,
    result: { from, to, turnoverOre, expectedOre, reportedOre, mismatches },
  };
}
