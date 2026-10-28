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
import {
  accounts,
  voucherChanges,
  voucherLines,
  voucherSeries,
  vouchers,
} from "@/lib/db/schema";
import { voucherNumberLabel } from "@/lib/money";
import { persistVoucherUnderlag } from "@/lib/voucher-files";
import { parseVoucherDate, todayIsoDate } from "@/lib/voucher-date";
import { parseVatCode } from "@/lib/vat-codes";
import { assertDateOpen, lockedPeriodError } from "@/lib/period-lock";
import { getLockedThrough } from "@/lib/period-lock-query";
import {
  assertVoucherEditable,
  buildVoucherSnapshot,
  snapshotsEqual,
  validateVoucherLines,
  type VoucherSnapshotLine,
} from "@/lib/voucher-changes";
import { LAST_VOUCHER_DATE_COOKIE, countCompanySeries } from "@/lib/vouchers";

export type SaveVoucherLineInput = {
  accountId: string;
  debitOre: number;
  creditOre: number;
  vatCode?: string | null;
};

export type SaveVoucherInput = {
  companyId: string;
  date: string;
  text: string;
  lines: SaveVoucherLineInput[];
  attachment?: File | null;
};

export type SaveVoucherResult =
  | {
      ok: true;
      voucherId: string;
      numberLabel: string;
      nextNumberLabel: string;
      attachmentError?: string;
    }
  | { ok: false; error: string };

export type AttachUnderlagResult =
  | { ok: true; fileName: string }
  | { ok: false; error: string };

export type UpdateVoucherInput = {
  companyId: string;
  voucherId: string;
  date: string;
  text: string;
  lines: SaveVoucherLineInput[];
};

export type UpdateVoucherResult =
  | { ok: true }
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
  const lockedThrough = await getLockedThrough(company.id);
  const periodCheck = assertDateOpen(date, lockedThrough);
  if (!periodCheck.ok) return periodCheck;
  const text = input.text.trim();
  if (!text) {
    return { ok: false, error: "Fyll i verifikationstext." };
  }

  const parsedLines = validateVoucherLines(input.lines);
  if (!parsedLines.ok) return parsedLines;
  const lines = parsedLines.lines;

  await ensureCompanyBooks(company.id);

  try {
    const saved = await db.transaction(async (tx) => {
      const accountRows = await tx
        .select({
          id: accounts.id,
          vatCode: accounts.vatCode,
          active: accounts.active,
        })
        .from(accounts)
        .where(eq(accounts.companyId, company.id));
      const accountById = new Map(accountRows.map((row) => [row.id, row]));

      for (const line of lines) {
        const account = accountById.get(line.accountId);
        if (!account || !account.active) {
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
          const parsedVat = parseVatCode(line.vatCode);
          const vatCode = parsedVat.ok
            ? line.vatCode === undefined
              ? (account?.vatCode ?? null)
              : parsedVat.code
            : (account?.vatCode ?? null);
          return {
            voucherId: voucher.id,
            lineNumber: index + 1,
            accountId: line.accountId,
            debit: line.debitOre,
            credit: line.creditOre,
            vatCode,
          };
        })
      );

      return { id: voucher.id, letter: series.letter, number };
    });

    revalidatePath(`/foretag/${company.id}/verifikationer`);
    cookieStore.set(LAST_VOUCHER_DATE_COOKIE, date, {
      httpOnly: true,
      sameSite: "lax",
      path: `/foretag/${company.id}`,
      maxAge: 60 * 60 * 24 * 365,
    });
    const seriesCount = await countCompanySeries(company.id);
    let attachmentError: string | undefined;
    if (input.attachment && input.attachment.size > 0) {
      const stored = await persistVoucherUnderlag(
        company.id,
        saved.id,
        input.attachment
      );
      if (!stored.ok) attachmentError = stored.error;
    }
    return {
      ok: true,
      voucherId: saved.id,
      numberLabel: voucherNumberLabel(saved.letter, saved.number, seriesCount),
      nextNumberLabel: voucherNumberLabel(
        saved.letter,
        saved.number + 1,
        seriesCount
      ),
      attachmentError,
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
    if (err instanceof Error && err.message.includes("PERIOD_LOCKED")) {
      const locked = await getLockedThrough(company.id);
      return {
        ok: false,
        error: locked ? lockedPeriodError(locked) : "Perioden är låst.",
      };
    }
    throw err;
  }
}

export async function updateVoucher(
  input: UpdateVoucherInput
): Promise<UpdateVoucherResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(input.companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  const parsedDate = parseVoucherDate(input.date, input.date);
  if (!parsedDate.ok) {
    return { ok: false, error: parsedDate.error };
  }
  const date = parsedDate.iso;
  const text = input.text.trim();
  if (!text) {
    return { ok: false, error: "Fyll i verifikationstext." };
  }

  const parsedLines = validateVoucherLines(input.lines);
  if (!parsedLines.ok) return parsedLines;
  const lines = parsedLines.lines;

  const lockedThrough = await getLockedThrough(company.id);

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: vouchers.id,
          date: vouchers.date,
          text: vouchers.text,
        })
        .from(vouchers)
        .where(
          and(eq(vouchers.id, input.voucherId), eq(vouchers.companyId, company.id))
        )
        .for("update");

      if (!existing) {
        throw new Error("MISSING");
      }

      const periodCheck = assertVoucherEditable(
        existing.date,
        date,
        lockedThrough
      );
      if (!periodCheck.ok) {
        throw new Error("PERIOD_LOCKED");
      }

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

      const currentLineRows = await tx
        .select({
          accountId: voucherLines.accountId,
          accountNumber: accounts.number,
          accountName: accounts.name,
          debit: voucherLines.debit,
          credit: voucherLines.credit,
          vatCode: voucherLines.vatCode,
        })
        .from(voucherLines)
        .innerJoin(accounts, eq(voucherLines.accountId, accounts.id))
        .where(eq(voucherLines.voucherId, existing.id))
        .orderBy(voucherLines.lineNumber);

      const nextLines: VoucherSnapshotLine[] = [];
      for (const line of lines) {
        const account = accountById.get(line.accountId);
        if (!account) {
          throw new Error("ACCOUNT");
        }
        if (!account.active && !currentLineRows.some((row) => row.accountId === account.id)) {
          throw new Error("ACCOUNT");
        }
        const parsedVat = parseVatCode(line.vatCode);
        const vatCode = parsedVat.ok
          ? line.vatCode === undefined
            ? (account.vatCode ?? null)
            : parsedVat.code
          : (account.vatCode ?? null);
        nextLines.push({
          accountId: account.id,
          accountNumber: account.number,
          accountName: account.name,
          debit: line.debitOre,
          credit: line.creditOre,
          vatCode,
        });
      }

      const before = buildVoucherSnapshot(
        existing.date,
        existing.text,
        currentLineRows
      );
      const after = buildVoucherSnapshot(date, text, nextLines);
      if (snapshotsEqual(before, after)) {
        throw new Error("UNCHANGED");
      }

      await tx.insert(voucherChanges).values({
        voucherId: existing.id,
        changedBy: user.id,
        before,
        after,
      });

      await tx
        .update(vouchers)
        .set({ date, text })
        .where(eq(vouchers.id, existing.id));

      await tx.delete(voucherLines).where(eq(voucherLines.voucherId, existing.id));
      await tx.insert(voucherLines).values(
        nextLines.map((line, index) => ({
          voucherId: existing.id,
          lineNumber: index + 1,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          vatCode: line.vatCode,
        }))
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message === "MISSING") {
      return { ok: false, error: "Verifikationen finns inte." };
    }
    if (err instanceof Error && err.message === "ACCOUNT") {
      return {
        ok: false,
        error: "Ett av kontona saknas eller tillhör inte företaget.",
      };
    }
    if (err instanceof Error && err.message === "UNCHANGED") {
      return { ok: false, error: "Inga ändringar att spara." };
    }
    if (err instanceof Error && err.message.includes("PERIOD_LOCKED")) {
      const locked = await getLockedThrough(company.id);
      return {
        ok: false,
        error: locked ? lockedPeriodError(locked) : "Perioden är låst.",
      };
    }
    throw err;
  }

  revalidatePath(`/foretag/${company.id}/verifikationer`);
  revalidatePath(`/foretag/${company.id}/verifikationer/${input.voucherId}`);
  revalidatePath(`/foretag/${company.id}/verifikationer/kort`);
  return { ok: true };
}

export async function attachVoucherUnderlag(
  companyId: string,
  voucherId: string,
  file: File
): Promise<AttachUnderlagResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  const voucher = await db
    .select({ date: vouchers.date })
    .from(vouchers)
    .where(and(eq(vouchers.id, voucherId), eq(vouchers.companyId, company.id)))
    .limit(1);
  if (!voucher[0]) {
    return { ok: false, error: "Verifikationen finns inte." };
  }
  const lockedThrough = await getLockedThrough(company.id);
  const periodCheck = assertDateOpen(voucher[0].date, lockedThrough);
  if (!periodCheck.ok) return periodCheck;

  const stored = await persistVoucherUnderlag(company.id, voucherId, file);
  if (!stored.ok) return stored;

  revalidatePath(`/foretag/${company.id}/verifikationer`);
  revalidatePath(`/foretag/${company.id}/verifikationer/${voucherId}`);
  return { ok: true, fileName: stored.stored.originalName };
}
