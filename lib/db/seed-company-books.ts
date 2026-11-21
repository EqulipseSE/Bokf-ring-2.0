import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  BAS_ACCOUNTS,
  DEFAULT_SERIES_DESCRIPTION,
  DEFAULT_SERIES_LETTER,
  INVOICE_METHOD_SERIES,
  defaultVatCode,
  type AccountDraft,
} from "@/lib/db/bas-accounts";
import { accounts, voucherSeries } from "@/lib/db/schema";

type BooksExecutor = Pick<typeof db, "insert" | "select">;

/** Lägger in serie A, och K plus L när företaget använder fakturametoden. */
export async function seedCompanyBooks(
  tx: BooksExecutor,
  companyId: string,
  accountList: readonly AccountDraft[] = BAS_ACCOUNTS,
  accountingMethod: "faktura" | "kontant" = "kontant"
): Promise<void> {
  const series =
    accountingMethod === "faktura"
      ? INVOICE_METHOD_SERIES
      : [{ letter: DEFAULT_SERIES_LETTER, description: DEFAULT_SERIES_DESCRIPTION }];
  await tx.insert(voucherSeries).values(
    series.map((item) => ({
      companyId,
      letter: item.letter,
      description: item.description,
      nextNumber: 1,
    }))
  );

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

/** Ser till att ett företag på fakturametoden har A 1930, K och L. */
export async function ensureInvoiceMethodSeries(companyId: string): Promise<void> {
  const existing = await db
    .select({
      id: voucherSeries.id,
      letter: voucherSeries.letter,
      description: voucherSeries.description,
    })
    .from(voucherSeries)
    .where(eq(voucherSeries.companyId, companyId));
  const byLetter = new Map(existing.map((row) => [row.letter, row]));

  for (const series of INVOICE_METHOD_SERIES) {
    const row = byLetter.get(series.letter);
    if (!row) {
      await db.insert(voucherSeries).values({
        companyId,
        letter: series.letter,
        description: series.description,
        nextNumber: 1,
      });
      continue;
    }
    if (series.letter === "A" && row.description === DEFAULT_SERIES_DESCRIPTION) {
      await db
        .update(voucherSeries)
        .set({ description: series.description })
        .where(eq(voucherSeries.id, row.id));
    }
  }
}
