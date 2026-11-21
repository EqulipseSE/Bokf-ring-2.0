"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import {
  accounts,
  companyDocuments,
  supplierInvoiceLines,
  supplierInvoices,
  voucherLines,
  voucherSeries,
  vouchers,
} from "@/lib/db/schema";

export type BulkResult = { ok: true; count: number } | { ok: false; error: string };

export async function approveSupplierInvoices(
  companyId: string,
  invoiceIds: string[]
): Promise<BulkResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  if (invoiceIds.length === 0) return { ok: false, error: "Markera minst en faktura." };

  const updated = await db
    .update(supplierInvoices)
    .set({ status: "godkand" })
    .where(and(eq(supplierInvoices.companyId, company.id), inArray(supplierInvoices.id, invoiceIds)))
    .returning({ id: supplierInvoices.id });

  revalidatePath(`/foretag/${companyId}/leverantorsfakturor`);
  return { ok: true, count: updated.length };
}

export async function bookSupplierInvoices(
  companyId: string,
  invoiceIds: string[]
): Promise<BulkResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  if (invoiceIds.length === 0) return { ok: false, error: "Markera minst en faktura." };

  const invoices = await db
    .select()
    .from(supplierInvoices)
    .where(and(eq(supplierInvoices.companyId, company.id), inArray(supplierInvoices.id, invoiceIds)));

  const pending = invoices.filter((invoice) => !invoice.bookedInK);
  if (pending.length === 0) return { ok: false, error: "De markerade fakturorna är redan bokförda." };

  try {
    await db.transaction(async (tx) => {
      const [series] = await tx
        .select()
        .from(voucherSeries)
        .where(and(eq(voucherSeries.companyId, company.id), eq(voucherSeries.letter, "L")))
        .for("update");
      if (!series) throw new Error("Serien L för leverantörsfakturor saknas.");

      let number = series.nextNumber;
      for (const invoice of pending) {
        const lines = await tx
          .select()
          .from(supplierInvoiceLines)
          .where(eq(supplierInvoiceLines.invoiceId, invoice.id))
          .orderBy(supplierInvoiceLines.lineNumber);
        const posted = lines.filter((line) => line.debitOre > 0 || line.creditOre > 0);
        if (posted.length === 0) throw new Error(`${invoice.supplierName} saknar kontering.`);

        let debit = 0;
        let credit = 0;
        const resolved: { accountId: string; debitOre: number; creditOre: number }[] = [];
        for (const line of posted) {
          let accountId = line.accountId;
          if (!accountId) {
            const [account] = await tx
              .select({ id: accounts.id })
              .from(accounts)
              .where(and(eq(accounts.companyId, company.id), eq(accounts.number, line.accountNumber)))
              .limit(1);
            accountId = account?.id ?? null;
          }
          if (!accountId) throw new Error(`Kontot ${line.accountNumber} finns inte.`);
          if ((line.debitOre > 0) === (line.creditOre > 0)) {
            throw new Error(`${invoice.supplierName} har en rad med både debet och kredit.`);
          }
          debit += line.debitOre;
          credit += line.creditOre;
          resolved.push({ accountId, debitOre: line.debitOre, creditOre: line.creditOre });
        }
        if (debit !== credit || debit === 0) {
          throw new Error(`${invoice.supplierName} går inte jämnt ut.`);
        }

        const [voucher] = await tx
          .insert(vouchers)
          .values({
            companyId: company.id,
            seriesId: series.id,
            number,
            date: invoice.invoiceDate ?? new Date().toISOString().slice(0, 10),
            text: `${invoice.supplierName} ${invoice.invoiceNumber}`,
            registeredBy: user.id,
          })
          .returning({ id: vouchers.id });
        if (!voucher) throw new Error("Verifikationen kunde inte sparas.");
        number += 1;

        await tx.insert(voucherLines).values(
          resolved.map((line, index) => ({
            voucherId: voucher.id,
            lineNumber: index + 1,
            accountId: line.accountId,
            debit: line.debitOre,
            credit: line.creditOre,
          }))
        );
        if (invoice.documentId) {
          await tx
            .update(companyDocuments)
            .set({ voucherId: voucher.id })
            .where(eq(companyDocuments.id, invoice.documentId));
        }
        await tx
          .update(supplierInvoices)
          .set({ bookedInK: true })
          .where(eq(supplierInvoices.id, invoice.id));
      }

      await tx.update(voucherSeries).set({ nextNumber: number }).where(eq(voucherSeries.id, series.id));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fakturorna kunde inte bokföras.";
    return { ok: false, error: message };
  }

  revalidatePath(`/foretag/${companyId}/leverantorsfakturor`);
  revalidatePath(`/foretag/${companyId}/verifikationer`);
  return { ok: true, count: pending.length };
}
