"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_USER, getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { DEFAULT_SERIES_LETTER } from "@/lib/db/bas-accounts";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import {
  accounts,
  bankTransactions,
  companyDocuments,
  voucherAttachments,
  voucherEditLines,
  voucherEdits,
  supplierInvoices,
  users,
  voucherLines,
  voucherSeries,
  vouchers,
} from "@/lib/db/schema";
import { voucherNumberLabel } from "@/lib/money";
import { matchSupplierInvoice } from "@/lib/supplier-invoice-match";
import { nextUnbookedTransaction, type NextVoucherTransaction } from "@/lib/next-bank-voucher";
import { persistVoucherUnderlag, removeStoredUnderlag } from "@/lib/voucher-files";
import { parseVoucherDate, todayIsoDate } from "@/lib/voucher-date";
import { parseVatCode } from "@/lib/vat-codes";
import { assertDateOpen, lockedPeriodError } from "@/lib/period-lock";
import { getLockedThrough } from "@/lib/period-lock-query";
import { LAST_VOUCHER_DATE_COOKIE, countCompanySeries } from "@/lib/vouchers";

export type SaveVoucherLineInput = {
  accountId: string;
  debitOre: number;
  creditOre: number;
  vatCode?: string | null;
  resultUnit?: string | null;
};

export type SaveVoucherInput = {
  companyId: string;
  date: string;
  text: string;
  lines: SaveVoucherLineInput[];
  attachment?: File | null;
  bankTransactionId?: string | null;
  documentId?: string | null;
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

  const lines = input.lines.filter(
    (line) => line.accountId || line.debitOre > 0 || line.creditOre > 0
  );
  if (lines.length === 0) {
    return { ok: false, error: "En ny verifikation kan inte sparas tom." };
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
    const parsedVat = parseVatCode(line.vatCode);
    if (!parsedVat.ok) {
      return { ok: false, error: parsedVat.error };
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
  if (process.env.NODE_ENV === "development" && user.id === DEV_USER.id) {
    await db
      .insert(users)
      .values({
        id: DEV_USER.id,
        email: DEV_USER.email,
        name: DEV_USER.name,
        passwordHash: "dev",
      })
      .onConflictDoNothing();
  }

  try {
    const saved = await db.transaction(async (tx) => {
      const accountRows = await tx
        .select({
          id: accounts.id,
          number: accounts.number,
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
            resultUnit: line.resultUnit?.trim() || null,
          };
        })
      );

      if (input.bankTransactionId) {
        await tx
          .update(bankTransactions)
          .set({ voucherId: voucher.id })
          .where(
            and(
              eq(bankTransactions.id, input.bankTransactionId),
              eq(bankTransactions.companyId, company.id),
              isNull(bankTransactions.voucherId)
            )
          );
        const debits2440 = lines
          .filter((line) => accountById.get(line.accountId)?.number === "2440" && line.debitOre > 0)
          .reduce((sum, line) => sum + line.debitOre, 0);
        if (debits2440 > 0) {
          const [payment] = await tx
            .select({
              amountOre: bankTransactions.amountOre,
              description: bankTransactions.description,
              referenceNumber: bankTransactions.referenceNumber,
            })
            .from(bankTransactions)
            .where(eq(bankTransactions.id, input.bankTransactionId))
            .limit(1);
          const invoiceRows = await tx
            .select({
              id: supplierInvoices.id,
              supplierName: supplierInvoices.supplierName,
              invoiceNumber: supplierInvoices.invoiceNumber,
              totalOre: supplierInvoices.totalOre,
              paymentDate: supplierInvoices.paymentDate,
              documentId: supplierInvoices.documentId,
            })
            .from(supplierInvoices)
            .where(eq(supplierInvoices.companyId, company.id));
          const parts = payment
            ? matchSupplierInvoice(
                {
                  amountOre: payment.amountOre,
                  description: payment.description,
                  referenceNumber: payment.referenceNumber,
                },
                invoiceRows
              )
            : null;
          const ids = (parts ?? [])
            .filter((part) => part.ore > 0)
            .map((part) => part.invoice.id);
          if (ids.length > 0 && ids.reduce((sum, id) => sum + (parts?.find((part) => part.invoice.id === id)?.ore ?? 0), 0) === debits2440) {
            await tx
              .update(supplierInvoices)
              .set({ bookedInA: true })
              .where(and(eq(supplierInvoices.companyId, company.id), inArray(supplierInvoices.id, ids)));
          }
        }
      }
      if (input.documentId) {
        await tx
          .update(companyDocuments)
          .set({ voucherId: voucher.id })
          .where(
            and(
              eq(companyDocuments.id, input.documentId),
              eq(companyDocuments.companyId, company.id),
              isNull(companyDocuments.voucherId)
            )
          );
      }

      return { id: voucher.id, letter: series.letter, number };
    });

    revalidatePath(`/foretag/${company.id}/verifikationer`);
    revalidatePath(`/foretag/${company.id}/verifikationer/${saved.id}`);
    revalidatePath(`/foretag/${company.id}/underlag`);
    revalidatePath(`/foretag/${company.id}/leverantorsfakturor`);
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

export async function updateVoucher(
  companyId: string,
  voucherId: string,
  input: { date: string; text: string; lines: SaveVoucherLineInput[] }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const text = input.text.trim();
  if (!text) return { ok: false, error: "Fyll i verifikationstext." };
  const parsedDate = parseVoucherDate(input.date, input.date);
  if (!parsedDate.ok) return { ok: false, error: parsedDate.error };

  const lines = input.lines.filter(
    (line) => line.accountId || line.debitOre > 0 || line.creditOre > 0
  );
  let debitSum = 0;
  let creditSum = 0;
  for (const line of lines) {
    if (!line.accountId) return { ok: false, error: "Varje rad måste ha ett konto." };
    if (
      !Number.isInteger(line.debitOre) ||
      !Number.isInteger(line.creditOre) ||
      line.debitOre < 0 ||
      line.creditOre < 0
    ) {
      return { ok: false, error: "Belopp måste anges i hela öre." };
    }
    if ((line.debitOre > 0) === (line.creditOre > 0)) {
      return { ok: false, error: "Varje rad måste ha belopp i antingen debet eller kredit." };
    }
    const parsedVat = parseVatCode(line.vatCode);
    if (!parsedVat.ok) return { ok: false, error: parsedVat.error };
    debitSum += line.debitOre;
    creditSum += line.creditOre;
  }
  if (lines.length > 0 && debitSum !== creditSum) {
    return { ok: false, error: "Debet och kredit måste vara lika." };
  }
  if (lines.length > 0 && debitSum === 0) {
    return { ok: false, error: "Verifikationen måste ha ett belopp." };
  }

  const lockedThrough = await getLockedThrough(company.id);

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          id: vouchers.id,
          date: vouchers.date,
          text: vouchers.text,
        })
        .from(vouchers)
        .where(and(eq(vouchers.id, voucherId), eq(vouchers.companyId, company.id)))
        .limit(1);
      if (!current) throw new Error("MISSING");

      const oldPeriod = assertDateOpen(current.date, lockedThrough);
      if (!oldPeriod.ok) throw new Error(oldPeriod.error);
      const newPeriod = assertDateOpen(parsedDate.iso, lockedThrough);
      if (!newPeriod.ok) throw new Error(newPeriod.error);

      const accountRows = await tx
        .select({ id: accounts.id, vatCode: accounts.vatCode, active: accounts.active })
        .from(accounts)
        .where(eq(accounts.companyId, company.id));
      const accountById = new Map(accountRows.map((row) => [row.id, row]));
      for (const line of lines) {
        const account = accountById.get(line.accountId);
        if (!account || !account.active) throw new Error("ACCOUNT");
      }

      const previousLines = await tx
        .select()
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, current.id))
        .orderBy(voucherLines.lineNumber);

      const [edit] = await tx
        .insert(voucherEdits)
        .values({
          voucherId: current.id,
          editedBy: user.id,
          previousDate: current.date,
          previousText: current.text,
        })
        .returning({ id: voucherEdits.id });

      if (previousLines.length > 0) {
        await tx.insert(voucherEditLines).values(
          previousLines.map((line) => ({
            editId: edit.id,
            lineNumber: line.lineNumber,
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            vatCode: line.vatCode,
            resultUnit: line.resultUnit,
          }))
        );
      }

      await tx
        .update(vouchers)
        .set({ date: parsedDate.iso, text })
        .where(eq(vouchers.id, current.id));
      await tx.delete(voucherLines).where(eq(voucherLines.voucherId, current.id));
      if (lines.length > 0) {
        await tx.insert(voucherLines).values(
          lines.map((line, index) => {
            const parsedVat = parseVatCode(line.vatCode);
            return {
              voucherId: current.id,
              lineNumber: index + 1,
              accountId: line.accountId,
              debit: line.debitOre,
              credit: line.creditOre,
              vatCode: parsedVat.ok ? parsedVat.code : null,
              resultUnit: line.resultUnit?.trim() || null,
            };
          })
        );
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "MISSING") return { ok: false, error: "Verifikationen finns inte." };
    if (message === "ACCOUNT") return { ok: false, error: "Kontot finns inte eller är inaktivt." };
    if (message) return { ok: false, error: message };
    return { ok: false, error: "Verifikationen kunde inte sparas." };
  }

  revalidatePath(`/foretag/${company.id}/verifikationer`);
  revalidatePath(`/foretag/${company.id}/verifikationer/${voucherId}`);
  revalidatePath(`/foretag/${company.id}/balansrapport`);
  revalidatePath(`/foretag/${company.id}/resultatrapport`);
  revalidatePath(`/foretag/${company.id}/huvudbok`);
  return { ok: true };
}

export async function nextVoucherTransaction(
  companyId: string,
  afterId: string | null
): Promise<{ ok: true; transaction: NextVoucherTransaction | null } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const transaction = await nextUnbookedTransaction(company.id, afterId);
  return { ok: true, transaction };
}

/** Tillfällig nollställning. Tar bort verifikationerna och börjar om på nummer 1. */
export async function resetCompanyVouchers(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const files = await db
    .select({ storagePath: voucherAttachments.storagePath })
    .from(voucherAttachments)
    .innerJoin(vouchers, eq(voucherAttachments.voucherId, vouchers.id))
    .where(eq(vouchers.companyId, company.id));

  await db.transaction(async (tx) => {
    await tx
      .update(companyDocuments)
      .set({ voucherId: null })
      .where(eq(companyDocuments.companyId, company.id));

    const rows = await tx
      .select({ id: vouchers.id })
      .from(vouchers)
      .where(eq(vouchers.companyId, company.id));
    const ids = rows.map((row) => row.id);
    if (ids.length > 0) {
      await tx.delete(voucherLines).where(inArray(voucherLines.voucherId, ids));
      await tx.delete(voucherEdits).where(inArray(voucherEdits.voucherId, ids));
      await tx.delete(voucherAttachments).where(inArray(voucherAttachments.voucherId, ids));
      await tx.delete(vouchers).where(eq(vouchers.companyId, company.id));
    }

    await tx
      .update(voucherSeries)
      .set({ nextNumber: 1 })
      .where(eq(voucherSeries.companyId, company.id));
  });

  for (const file of files) {
    await removeStoredUnderlag(file.storagePath);
  }

  revalidatePath(`/foretag/${company.id}/verifikationer`);
  revalidatePath(`/foretag/${company.id}/balansrapport`);
  revalidatePath(`/foretag/${company.id}/resultatrapport`);
  revalidatePath(`/foretag/${company.id}/huvudbok`);
  revalidatePath(`/foretag/${company.id}/underlag`);
  revalidatePath(`/foretag/${company.id}/underlag/kundfakturor`);
  revalidatePath(`/foretag/${company.id}/underlag/leverantorsfakturor`);
  revalidatePath(`/foretag/${company.id}/underlag/kvitton`);
  revalidatePath(`/foretag/${company.id}/underlag/loner`);
  revalidatePath(`/foretag/${company.id}/underlag/ovriga`);
  return { ok: true };
}
