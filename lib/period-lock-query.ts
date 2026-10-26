import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { parseVatPeriodKind } from "@/lib/company-settings";
import { db } from "@/lib/db";
import { companies, companyPeriodLocks, vouchers } from "@/lib/db/schema";
import {
  buildPeriodRows,
  effectiveLockedThrough,
  lockablePeriods,
  monthsInPeriod,
  nextLockTarget,
  parseYearQuery,
  validateLockThrough,
  vatLockKindLabel,
  type PeriodLockPageData,
} from "@/lib/period-lock";
import { availableYears } from "@/lib/vat-declaration";
import { listVoucherYears } from "@/lib/vat-declaration-query";
import { todayIsoDate } from "@/lib/voucher-date";

async function companyVatKind(companyId: string) {
  const [company] = await db
    .select({ vatPeriod: companies.vatPeriod })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const parsed = parseVatPeriodKind(company?.vatPeriod ?? "manad");
  return parsed.ok ? parsed.value : "manad";
}

/** Tar bort månadslås som inte är ett giltigt periodslut för nuvarande momsperiod. */
export async function discardInvalidPeriodLock(
  companyId: string
): Promise<void> {
  const kind = await companyVatKind(companyId);
  const [row] = await db
    .select({ lockedThrough: companyPeriodLocks.lockedThrough })
    .from(companyPeriodLocks)
    .where(eq(companyPeriodLocks.companyId, companyId))
    .limit(1);
  if (!row) return;
  if (effectiveLockedThrough(row.lockedThrough, kind)) return;
  await db
    .delete(companyPeriodLocks)
    .where(eq(companyPeriodLocks.companyId, companyId));
}

export async function getLockedThrough(
  companyId: string
): Promise<string | null> {
  await discardInvalidPeriodLock(companyId);
  const kind = await companyVatKind(companyId);
  const [row] = await db
    .select({ lockedThrough: companyPeriodLocks.lockedThrough })
    .from(companyPeriodLocks)
    .where(eq(companyPeriodLocks.companyId, companyId))
    .limit(1);
  return effectiveLockedThrough(row?.lockedThrough ?? null, kind);
}

export async function getPeriodLockView(
  companyId: string,
  yearQuery?: string | string[]
): Promise<PeriodLockPageData> {
  const today = todayIsoDate();
  const [company, lock, voucherYears] = await Promise.all([
    db
      .select({ vatPeriod: companies.vatPeriod })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1),
    db
      .select({
        lockedThrough: companyPeriodLocks.lockedThrough,
        lockedAt: companyPeriodLocks.lockedAt,
      })
      .from(companyPeriodLocks)
      .where(eq(companyPeriodLocks.companyId, companyId))
      .limit(1),
    listVoucherYears(companyId),
  ]);

  const parsedKind = parseVatPeriodKind(company[0]?.vatPeriod ?? "manad");
  const kind = parsedKind.ok ? parsedKind.value : "manad";
  const rawThrough = lock[0]?.lockedThrough ?? null;
  if (rawThrough && !effectiveLockedThrough(rawThrough, kind)) {
    await db
      .delete(companyPeriodLocks)
      .where(eq(companyPeriodLocks.companyId, companyId));
  }
  const lockedThrough = effectiveLockedThrough(rawThrough, kind);
  const next = nextLockTarget(lockedThrough, Number(today.slice(0, 4)), kind);
  const years = availableYears(today, [
    ...voucherYears,
    next.year,
    lockedThrough ? Number(lockedThrough.slice(0, 4)) : next.year,
  ]);
  const year = parseYearQuery(yearQuery, next.year);

  const counts = await db
    .select({
      month: sql<number>`extract(month from ${vouchers.date})::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(vouchers)
    .where(
      and(
        eq(vouchers.companyId, companyId),
        eq(vouchers.isOpening, false),
        sql`extract(year from ${vouchers.date}) = ${year}`
      )
    )
    .groupBy(sql`extract(month from ${vouchers.date})`);

  const countByMonth = new Map<number, number>();
  for (const row of counts) {
    countByMonth.set(Number(row.month), Number(row.n));
  }

  const periods = buildPeriodRows(kind, year, lockedThrough).map((row) => ({
    ...row,
    voucherCount: monthsInPeriod(kind, row.number).reduce(
      (sum, month) => sum + (countByMonth.get(month) ?? 0),
      0
    ),
  }));

  return {
    kind,
    kindLabel: vatLockKindLabel(kind),
    year,
    years,
    lockedThrough,
    lockedAt: lock[0]?.lockedAt ?? null,
    next,
    periods,
    lockable: lockablePeriods(kind, year, lockedThrough),
  };
}

export async function savePeriodLock(
  companyId: string,
  userId: string,
  nextThrough: string
): Promise<
  { ok: true; lockedThrough: string } | { ok: false; error: string }
> {
  const [company] = await db
    .select({ vatPeriod: companies.vatPeriod })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const parsedKind = parseVatPeriodKind(company?.vatPeriod ?? "manad");
  const kind = parsedKind.ok ? parsedKind.value : "manad";
  await discardInvalidPeriodLock(companyId);
  const current = await getLockedThrough(companyId);
  const parsed = validateLockThrough(nextThrough, current, kind);
  if (!parsed.ok) return parsed;

  if (current) {
    const [updated] = await db
      .update(companyPeriodLocks)
      .set({
        lockedThrough: parsed.through,
        lockedAt: new Date(),
        lockedBy: userId,
      })
      .where(eq(companyPeriodLocks.companyId, companyId))
      .returning({ lockedThrough: companyPeriodLocks.lockedThrough });
    if (!updated) {
      return { ok: false, error: "Kunde inte låsa perioden." };
    }
    return { ok: true, lockedThrough: updated.lockedThrough };
  }

  const [inserted] = await db
    .insert(companyPeriodLocks)
    .values({
      companyId,
      lockedThrough: parsed.through,
      lockedBy: userId,
    })
    .returning({ lockedThrough: companyPeriodLocks.lockedThrough });
  if (!inserted) {
    return { ok: false, error: "Kunde inte låsa perioden." };
  }
  return { ok: true, lockedThrough: inserted.lockedThrough };
}
