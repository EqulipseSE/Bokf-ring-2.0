"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { accounts, supplierInvoiceLines, supplierInvoices, suppliers } from "@/lib/db/schema";

export type SupplierInvoiceLineDraft = {
  accountId: string;
  accountNumber: string;
  debitOre: number;
  creditOre: number;
};

export type SupplierInvoiceDraft = {
  supplierId: string;
  supplierNumber: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentDate?: string;
  totalOre: number;
  vatOre: number;
  freightOre: number;
  lines: SupplierInvoiceLineDraft[];
  approve?: boolean;
};

export type SaveResult = { ok: true } | { ok: false; error: string };

function day(value: string): string | null | false {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  return trimmed;
}

export async function createSupplierInvoice(
  companyId: string,
  draft: SupplierInvoiceDraft
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const supplierName = draft.supplierName.trim();
  const invoiceNumber = draft.invoiceNumber.trim();
  if (!supplierName) return { ok: false, error: "Ange en leverantör." };
  if (!invoiceNumber) return { ok: false, error: "Ange fakturanummer." };

  const invoiceDate = day(draft.invoiceDate);
  const dueDate = day(draft.dueDate);
  if (invoiceDate === false || dueDate === false) {
    return { ok: false, error: "Datumet ska vara ÅÅÅÅ-MM-DD." };
  }

  const lines = draft.lines.filter(
    (line) => line.accountNumber.trim() && (line.debitOre > 0 || line.creditOre > 0)
  );
  if (lines.length === 0) return { ok: false, error: "Lägg in minst en konteringsrad." };

  let supplierId: string | null = null;
  if (draft.supplierId) {
    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, draft.supplierId), eq(suppliers.companyId, companyId)));
    if (!supplier) return { ok: false, error: "Leverantören finns inte." };
    supplierId = supplier.id;
  }

  const accountIds = [...new Set(lines.map((line) => line.accountId).filter(Boolean))];
  if (accountIds.length > 0) {
    const rows = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.companyId, companyId));
    const known = new Set(rows.map((row) => row.id));
    if (accountIds.some((id) => !known.has(id))) {
      return { ok: false, error: "Ett konto hör inte till företaget." };
    }
  }

  const [latest] = await db
    .select({ levfakturaNumber: supplierInvoices.levfakturaNumber })
    .from(supplierInvoices)
    .where(eq(supplierInvoices.companyId, companyId))
    .orderBy(desc(supplierInvoices.levfakturaNumber))
    .limit(1);

  const [created] = await db
    .insert(supplierInvoices)
    .values({
      companyId,
      supplierId,
      supplierNumber: draft.supplierNumber.trim() || null,
      supplierName,
      invoiceNumber,
      invoiceDate,
      dueDate,
      totalOre: draft.totalOre,
      vatOre: draft.vatOre,
      freightOre: draft.freightOre,
      levfakturaNumber: (latest?.levfakturaNumber ?? 0) + 1,
      ...(draft.approve ? { status: "godkand" } : {}),
    })
    .returning({ id: supplierInvoices.id });

  if (!created) return { ok: false, error: "Fakturan kunde inte sparas." };

  await db.insert(supplierInvoiceLines).values(
    lines.map((line, index) => ({
      invoiceId: created.id,
      lineNumber: index + 1,
      accountId: line.accountId || null,
      accountNumber: line.accountNumber.trim(),
      debitOre: line.debitOre,
      creditOre: line.creditOre,
    }))
  );

  revalidatePath(`/foretag/${companyId}/leverantorsfakturor`);
  return { ok: true };
}

export async function updateSupplierInvoice(
  companyId: string,
  invoiceId: string,
  draft: SupplierInvoiceDraft
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const supplierName = draft.supplierName.trim();
  const invoiceNumber = draft.invoiceNumber.trim();
  if (!supplierName) return { ok: false, error: "Ange en leverantör." };
  if (!invoiceNumber) return { ok: false, error: "Ange fakturanummer." };
  const invoiceDate = day(draft.invoiceDate);
  const dueDate = day(draft.dueDate);
  const paymentDate = draft.paymentDate == null ? undefined : day(draft.paymentDate);
  if (invoiceDate === false || dueDate === false || paymentDate === false) {
    return { ok: false, error: "Datumet ska vara ÅÅÅÅ-MM-DD." };
  }
  const lines = draft.lines.filter(
    (line) => line.accountNumber.trim() && (line.debitOre > 0 || line.creditOre > 0)
  );
  if (lines.length === 0) return { ok: false, error: "Lägg in minst en konteringsrad." };

  const updated = await db
    .update(supplierInvoices)
    .set({
      supplierId: draft.supplierId || null,
      supplierNumber: draft.supplierNumber.trim() || null,
      supplierName,
      invoiceNumber,
      invoiceDate,
      dueDate,
      ...(paymentDate !== undefined ? { paymentDate } : {}),
      totalOre: draft.totalOre,
      vatOre: draft.vatOre,
      freightOre: draft.freightOre,
      ...(draft.approve ? { status: "godkand" } : {}),
    })
    .where(and(eq(supplierInvoices.companyId, company.id), eq(supplierInvoices.id, invoiceId)))
    .returning({ id: supplierInvoices.id });
  if (updated.length === 0) return { ok: false, error: "Fakturan finns inte." };

  await db.delete(supplierInvoiceLines).where(eq(supplierInvoiceLines.invoiceId, invoiceId));
  await db.insert(supplierInvoiceLines).values(
    lines.map((line, index) => ({
      invoiceId,
      lineNumber: index + 1,
      accountId: line.accountId || null,
      accountNumber: line.accountNumber.trim(),
      debitOre: line.debitOre,
      creditOre: line.creditOre,
    }))
  );
  revalidatePath(`/foretag/${companyId}/leverantorsfakturor`);
  revalidatePath(`/foretag/${companyId}/leverantorsfakturor/${invoiceId}`);
  return { ok: true };
}
