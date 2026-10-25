import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  BAS_ACCOUNTS,
  DEFAULT_SERIES_DESCRIPTION,
  DEFAULT_SERIES_LETTER,
} from "@/lib/db/bas-accounts";
import { accounts, voucherSeries } from "@/lib/db/schema";

type BooksExecutor = Pick<typeof db, "insert" | "select">;

/** Lägger in serie A och en användbar BAS-kontoplan för ett företag. */
export async function seedCompanyBooks(
  tx: BooksExecutor,
  companyId: string
): Promise<void> {
  await tx.insert(voucherSeries).values({
    companyId,
    letter: DEFAULT_SERIES_LETTER,
    description: DEFAULT_SERIES_DESCRIPTION,
    nextNumber: 1,
  });

  await tx.insert(accounts).values(
    BAS_ACCOUNTS.map((account) => ({
      companyId,
      number: account.number,
      name: account.name,
      vatCode: account.vatCode,
      active: true,
    }))
  );
}

/**
 * Säkerställer att företaget har kontoplan och serie A.
 * Används både när ett företag skapas och när ett äldre företag öppnas.
 */
export async function ensureCompanyBooks(companyId: string): Promise<void> {
  const existing = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.companyId, companyId))
    .limit(1);
  if (existing.length > 0) return;

  await db.transaction(async (tx) => {
    const again = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.companyId, companyId))
      .limit(1);
    if (again.length > 0) return;

    const series = await tx
      .select({ id: voucherSeries.id })
      .from(voucherSeries)
      .where(
        and(
          eq(voucherSeries.companyId, companyId),
          eq(voucherSeries.letter, DEFAULT_SERIES_LETTER)
        )
      )
      .limit(1);
    if (series.length > 0) {
      await tx.insert(accounts).values(
        BAS_ACCOUNTS.map((account) => ({
          companyId,
          number: account.number,
          name: account.name,
          vatCode: account.vatCode,
          active: true,
        }))
      );
      return;
    }

    await seedCompanyBooks(tx, companyId);
  });
}
