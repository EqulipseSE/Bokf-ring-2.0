"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  balanceAdjustmentText,
  linesForBalanceDiff,
  type BalanceKind,
} from "@/lib/balance-adjustment";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { DEFAULT_SERIES_LETTER } from "@/lib/db/bas-accounts";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import { accounts, voucherLines, voucherSeries, vouchers } from "@/lib/db/schema";
import { voucherNumberLabel } from "@/lib/money";
import { todayIsoDate } from "@/lib/voucher-date";
import { countCompanySeries, getAccountBalances, getOpeningBalances } from "@/lib/vouchers";

export type SetAccountActiveResult =
  | { ok: true; active: boolean }
  | { ok: false; error: string };

export async function setAccountActive(
  companyId: string,
  accountId: string,
  active: boolean
): Promise<SetAccountActiveResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  const [updated] = await db
    .update(accounts)
    .set({ active })
    .where(and(eq(accounts.id, accountId), eq(accounts.companyId, company.id)))
    .returning({ id: accounts.id, active: accounts.active });

  if (!updated) {
    return { ok: false, error: "Kontot finns inte." };
  }

  revalidatePath(`/foretag/${company.id}/kontoplan`);
  revalidatePath(`/foretag/${company.id}/verifikationer/ny`);
  return { ok: true, active: updated.active };
}

export type SaveBalanceAdjustmentInput = {
  companyId: string;
  accountId: string;
  contraAccountId: string;
  kind: BalanceKind;
  newOre: number;
};

export type SaveBalanceAdjustmentResult =
  | { ok: true; voucherId: string; numberLabel: string }
  | { ok: false; error: string };

export async function saveBalanceAdjustment(
  input: SaveBalanceAdjustmentInput
): Promise<SaveBalanceAdjustmentResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(input.companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  if (input.kind !== "opening" && input.kind !== "closing") {
    return { ok: false, error: "Ogiltig saldotyp." };
  }
  if (!Number.isInteger(input.newOre)) {
    return { ok: false, error: "Belopp måste anges i hela öre." };
  }

  const currentBalances =
    input.kind === "opening"
      ? await getOpeningBalances(company.id)
      : await getAccountBalances(company.id);
  const currentOre = currentBalances[input.accountId] ?? 0;
  const diffOre = input.newOre - currentOre;
  const built = linesForBalanceDiff(input.accountId, input.contraAccountId, diffOre);
  if (!built.ok) return built;

  await ensureCompanyBooks(company.id);

  try {
    const saved = await db.transaction(async (tx) => {
      const accountRows = await tx
        .select({
          id: accounts.id,
          number: accounts.number,
          name: accounts.name,
          vatCode: accounts.vatCode,
          active: accounts.active,
        })
        .from(accounts)
        .where(eq(accounts.companyId, company.id));
      const accountById = new Map(accountRows.map((row) => [row.id, row]));

      const account = accountById.get(input.accountId);
      const contra = accountById.get(input.contraAccountId);
      if (!account) {
        throw new Error("ACCOUNT");
      }
      if (!contra || !contra.active) {
        throw new Error("CONTRA");
      }

      const [series] = await tx
        .select()
        .from(voucherSeries)
        .where(
          and(
            eq(voucherSeries.companyId, company.id),
            eq(voucherSeries.letter, DEFAULT_SERIES_LETTER)
          )
        )
        .for("update");

      if (!series) {
        throw new Error("SERIES");
      }

      const number = series.nextNumber;
      await tx
        .update(voucherSeries)
        .set({ nextNumber: number + 1 })
        .where(eq(voucherSeries.id, series.id));

      const [voucher] = await tx
        .insert(vouchers)
        .values({
          companyId: company.id,
          seriesId: series.id,
          number,
          date: todayIsoDate(),
          text: balanceAdjustmentText(input.kind, account.number, account.name),
          registeredBy: user.id,
          isOpening: input.kind === "opening",
        })
        .returning({ id: vouchers.id });

      await tx.insert(voucherLines).values(
        built.lines.map((line, index) => {
          const lineAccount = accountById.get(line.accountId);
          return {
            voucherId: voucher.id,
            lineNumber: index + 1,
            accountId: line.accountId,
            debit: line.debitOre,
            credit: line.creditOre,
            vatCode: lineAccount?.vatCode ?? null,
          };
        })
      );

      return { id: voucher.id, letter: series.letter, number };
    });

    revalidatePath(`/foretag/${company.id}/kontoplan`);
    revalidatePath(`/foretag/${company.id}/verifikationer`);
    revalidatePath(`/foretag/${company.id}/verifikationer/ny`);
    const seriesCount = await countCompanySeries(company.id);
    return {
      ok: true,
      voucherId: saved.id,
      numberLabel: voucherNumberLabel(saved.letter, saved.number, seriesCount),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT") {
      return { ok: false, error: "Kontot finns inte." };
    }
    if (err instanceof Error && err.message === "CONTRA") {
      return {
        ok: false,
        error: "Motkontot saknas, är inaktivt eller tillhör inte företaget.",
      };
    }
    if (err instanceof Error && err.message === "SERIES") {
      return { ok: false, error: "Verifikationsserie saknas." };
    }
    throw err;
  }
}
