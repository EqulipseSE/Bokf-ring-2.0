import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  BAS_ACCOUNTS,
  DEFAULT_SERIES_DESCRIPTION,
  DEFAULT_SERIES_LETTER,
  defaultVatCode,
  type AccountDraft,
} from "@/lib/db/bas-accounts";
import { accounts, voucherSeries } from "@/lib/db/schema";

type BooksExecutor = Pick<typeof db, "insert" | "select">;

/** Lägger in serie A och given kontoplan (default: hela BAS 2026). */
export async function seedCompanyBooks(
  tx: BooksExecutor,
  companyId: string,
  accountList: readonly AccountDraft[] = BAS_ACCOUNTS
): Promise<void> {
  await tx.insert(voucherSeries).values({
    companyId,
    letter: DEFAULT_SERIES_LETTER,
    description: DEFAULT_SERIES_DESCRIPTION,
    nextNumber: 1,
  });

  await tx.insert(accounts).values(
    accountList.map((account) => ({
      companyId,
      number: account.number,
      name: account.name,
      vatCode: defaultVatCode(account.number, account.name),
      active: true,
    }))
  );
}

/**
 * Säkerställer att företaget har kontoplan och serie A.
 * Företag utan konton får hela BAS. Befintliga korta listor lämnas orörda.
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
          vatCode: defaultVatCode(account.number, account.name),
          active: true,
        }))
      );
      return;
    }

    await seedCompanyBooks(tx, companyId);
  });
}
