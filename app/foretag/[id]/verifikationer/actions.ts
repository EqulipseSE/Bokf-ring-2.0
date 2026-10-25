"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { DEFAULT_SERIES_LETTER } from "@/lib/db/bas-accounts";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import { accounts, voucherLines, voucherSeries, vouchers } from "@/lib/db/schema";
import { voucherNumberLabel } from "@/lib/money";
import { parseVoucherDate, todayIsoDate } from "@/lib/voucher-date";
import { LAST_VOUCHER_DATE_COOKIE, countCompanySeries } from "@/lib/vouchers";

export type SaveVoucherLineInput = {
  accountId: string;
  debitOre: number;
  creditOre: number;
};

export type SaveVoucherInput = {
  companyId: string;
  date: string;
  text: string;
  lines: SaveVoucherLineInput[];
};

export type SaveVoucherResult =
  | { ok: true; numberLabel: string; nextNumberLabel: string }
  | { ok: false; error: string };

export async function saveVoucher(
  input: SaveVoucherInput
): Promise<SaveVoucherResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(input.companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  const cookieStore = await cookies();
  const stored = cookieStore.get(LAST_VOUCHER_DATE_COOKIE)?.value;
  const referenceDate = stored && /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : todayIsoDate();
  const parsedDate = parseVoucherDate(input.date, referenceDate);
  if (!parsedDate.ok) {
    return { ok: false, error: parsedDate.error };
  }
  const date = parsedDate.iso;
  const text = input.text.trim();
  if (!text) {
    return { ok: false, error: "Fyll i verifikationstext." };
  }

  const lines = input.lines.filter(
    (line) => line.accountId || line.debitOre > 0 || line.creditOre > 0
  );
  if (lines.length < 2) {
    return { ok: false, error: "Minst två rader krävs." };
  }

  let debitSum = 0;
  let creditSum = 0;
  for (const line of lines) {
    if (!line.accountId) {
      return { ok: false, error: "Varje rad måste ha ett konto." };
    }
    if (
      !Number.isInteger(line.debitOre) ||
      !Number.isInteger(line.creditOre) ||
      line.debitOre < 0 ||
      line.creditOre < 0
    ) {
      return { ok: false, error: "Belopp måste anges i hela öre." };
    }
    const hasDebit = line.debitOre > 0;
    const hasCredit = line.creditOre > 0;
    if (hasDebit === hasCredit) {
      return {
        ok: false,
        error: "Varje rad måste ha belopp i antingen debet eller kredit.",
      };
    }
    debitSum += line.debitOre;
    creditSum += line.creditOre;
  }

  if (debitSum !== creditSum) {
    return { ok: false, error: "Debet och kredit måste vara lika." };
  }
  if (debitSum === 0) {
    return { ok: false, error: "Verifikationen måste ha ett belopp." };
  }

  await ensureCompanyBooks(company.id);

  try {
    const saved = await db.transaction(async (tx) => {
      const accountRows = await tx
        .select({
          id: accounts.id,
          vatCode: accounts.vatCode,
        })
        .from(accounts)
        .where(eq(accounts.companyId, company.id));
      const accountById = new Map(accountRows.map((row) => [row.id, row]));

      for (const line of lines) {
        if (!accountById.has(line.accountId)) {
          throw new Error("ACCOUNT");
        }
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
          date,
          text,
          registeredBy: user.id,
        })
        .returning({ id: vouchers.id });

      await tx.insert(voucherLines).values(
        lines.map((line, index) => {
          const account = accountById.get(line.accountId);
          return {
            voucherId: voucher.id,
            lineNumber: index + 1,
            accountId: line.accountId,
            debit: line.debitOre,
            credit: line.creditOre,
            vatCode: account?.vatCode ?? null,
          };
        })
      );

      return { letter: series.letter, number };
    });

    revalidatePath(`/foretag/${company.id}/verifikationer`);
    cookieStore.set(LAST_VOUCHER_DATE_COOKIE, date, {
      httpOnly: true,
      sameSite: "lax",
      path: `/foretag/${company.id}`,
      maxAge: 60 * 60 * 24 * 365,
    });
    const seriesCount = await countCompanySeries(company.id);
    return {
      ok: true,
      numberLabel: voucherNumberLabel(saved.letter, saved.number, seriesCount),
      nextNumberLabel: voucherNumberLabel(
        saved.letter,
        saved.number + 1,
        seriesCount
      ),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT") {
      return {
        ok: false,
        error: "Ett av kontona saknas eller tillhör inte företaget.",
      };
    }
    if (err instanceof Error && err.message === "SERIES") {
      return { ok: false, error: "Verifikationsserie saknas." };
    }
    throw err;
  }
}
