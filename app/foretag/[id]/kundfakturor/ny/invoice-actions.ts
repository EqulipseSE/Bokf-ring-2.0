"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { articles, customers, invoiceLines, invoices } from "@/lib/db/schema";

const TYPES = new Set(["faktura", "kvitto", "kreditfaktura", "avrakning"]);
const PAYMENT_DAYS = new Set([0, 10, 15, 20, 30, 60]);
const CURRENCIES = new Set(["SEK", "EUR", "USD", "NOK", "DKK", "GBP"]);

export type SaveInvoiceResult = { ok: true } | { ok: false; error: string };

export type InvoiceDraft = {
  invoiceType: string;
  customerId: string;
  customerNumber: string;
  customerName: string;
  reference: string;
  invoiceDate: string;
  paymentDays: number;
  dueDate: string;
  purchaseDate: string;
  ownComment: string;
  invoiceComment: string;
  pricesIncludeVat: boolean;
  freight: string;
  invoiceFee: string;
  currency: string;
  netOre: number;
  vatOre: number;
  grossOre: number;
  roundingOre: number;
  totalOre: number;
  lines: {
    articleId: string;
    articleNumber: string;
    name: string;
    unitPrice: string;
    quantity: string;
    vatCode: string;
    accountNumber: string;
    sumOre: number | null;
  }[];
};

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function day(value: string): string | null | false {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  return trimmed;
}

export async function createInvoice(
  companyId: string,
  draft: InvoiceDraft
): Promise<SaveInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  if (!TYPES.has(draft.invoiceType)) return { ok: false, error: "Välj typ av faktura." };
  const customerName = blank(draft.customerName);
  if (!customerName) return { ok: false, error: "Ange en kund." };
  if (!PAYMENT_DAYS.has(draft.paymentDays)) {
    return { ok: false, error: "Välj betalningsvillkor." };
  }
  if (!CURRENCIES.has(draft.currency)) return { ok: false, error: "Välj valuta." };

  const invoiceDate = day(draft.invoiceDate);
  const dueDate = day(draft.dueDate);
  const purchaseDate = day(draft.purchaseDate);
  if (invoiceDate === false || dueDate === false || purchaseDate === false) {
    return { ok: false, error: "Datumet är ogiltigt." };
  }

  let customerId: string | null = null;
  if (draft.customerId) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, draft.customerId), eq(customers.companyId, company.id)));
    customerId = customer?.id ?? null;
  }

  const articleIds = [
    ...new Set(draft.lines.map((line) => line.articleId).filter(Boolean)),
  ];
  const knownArticles = new Set<string>();
  if (articleIds.length > 0) {
    const rows = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.companyId, company.id));
    for (const row of rows) {
      if (articleIds.includes(row.id)) knownArticles.add(row.id);
    }
  }

  const lines = draft.lines.filter(
    (line): line is InvoiceDraft["lines"][number] & { sumOre: number } => line.sumOre !== null
  );

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ number: invoices.number })
      .from(invoices)
      .where(eq(invoices.companyId, company.id));
    const number = String(
      existing.reduce((max, row) => Math.max(max, Number(row.number) || 0), 0) + 1
    );
    const [invoice] = await tx
      .insert(invoices)
      .values({
        companyId: company.id,
        number,
        invoiceType: draft.invoiceType,
        customerId,
        customerNumber: blank(draft.customerNumber),
        customerName,
        reference: blank(draft.reference),
        invoiceDate,
        paymentDays: draft.paymentDays,
        dueDate,
        purchaseDate,
        ownComment: blank(draft.ownComment),
        invoiceComment: blank(draft.invoiceComment),
        pricesIncludeVat: draft.pricesIncludeVat,
        freight: blank(draft.freight),
        invoiceFee: blank(draft.invoiceFee),
        currency: draft.currency,
        netOre: draft.netOre,
        vatOre: draft.vatOre,
        grossOre: draft.grossOre,
        roundingOre: draft.roundingOre,
        totalOre: draft.totalOre,
      })
      .returning({ id: invoices.id });

    if (lines.length > 0) {
      await tx.insert(invoiceLines).values(
        lines.map((line, index) => ({
          invoiceId: invoice.id,
          lineNumber: index + 1,
          articleId: line.articleId && knownArticles.has(line.articleId) ? line.articleId : null,
          articleNumber: blank(line.articleNumber),
          name: blank(line.name),
          unitPrice: blank(line.unitPrice),
          quantity: blank(line.quantity),
          vatCode: blank(line.vatCode),
          accountNumber: blank(line.accountNumber),
          sumOre: line.sumOre,
        }))
      );
    }
  });

  revalidatePath(`/foretag/${company.id}/kundfakturor`);
  return { ok: true };
}

export async function updateInvoice(
  companyId: string,
  invoiceId: string,
  draft: InvoiceDraft
): Promise<SaveInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  if (!TYPES.has(draft.invoiceType)) return { ok: false, error: "Välj typ av faktura." };
  const customerName = blank(draft.customerName);
  if (!customerName) return { ok: false, error: "Ange en kund." };
  const invoiceDate = day(draft.invoiceDate);
  const dueDate = day(draft.dueDate);
  const purchaseDate = day(draft.purchaseDate);
  if (invoiceDate === false || dueDate === false || purchaseDate === false) {
    return { ok: false, error: "Datumet är ogiltigt." };
  }
  const lines = draft.lines.filter(
    (line): line is InvoiceDraft["lines"][number] & { sumOre: number } => line.sumOre !== null
  );
  const updated = await db
    .update(invoices)
    .set({
      invoiceType: draft.invoiceType,
      customerId: draft.customerId || null,
      customerNumber: blank(draft.customerNumber),
      customerName,
      reference: blank(draft.reference),
      invoiceDate,
      paymentDays: draft.paymentDays,
      dueDate,
      purchaseDate,
      ownComment: blank(draft.ownComment),
      invoiceComment: blank(draft.invoiceComment),
      pricesIncludeVat: draft.pricesIncludeVat,
      freight: blank(draft.freight),
      invoiceFee: blank(draft.invoiceFee),
      currency: draft.currency,
      netOre: draft.netOre,
      vatOre: draft.vatOre,
      grossOre: draft.grossOre,
      roundingOre: draft.roundingOre,
      totalOre: draft.totalOre,
    })
    .where(and(eq(invoices.companyId, company.id), eq(invoices.id, invoiceId)))
    .returning({ id: invoices.id });
  if (updated.length === 0) return { ok: false, error: "Fakturan finns inte." };
  await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
  if (lines.length > 0) {
    await db.insert(invoiceLines).values(
      lines.map((line, index) => ({
        invoiceId,
        lineNumber: index + 1,
        articleId: line.articleId || null,
        articleNumber: blank(line.articleNumber),
        name: blank(line.name),
        unitPrice: blank(line.unitPrice),
        quantity: blank(line.quantity),
        vatCode: blank(line.vatCode),
        accountNumber: blank(line.accountNumber),
        sumOre: line.sumOre,
      }))
    );
  }
  revalidatePath(`/foretag/${company.id}/kundfakturor`);
  return { ok: true };
}

export async function setInvoicePaymentDate(
  companyId: string,
  invoiceId: string,
  value: string
): Promise<SaveInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const trimmed = value.trim();
  const paymentDate = trimmed === "" ? null : trimmed;
  if (paymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return { ok: false, error: "Datumet ska vara ÅÅÅÅ-MM-DD." };
  }
  const updated = await db
    .update(invoices)
    .set({ paymentDate })
    .where(and(eq(invoices.companyId, company.id), eq(invoices.id, invoiceId)))
    .returning({ id: invoices.id });
  if (updated.length === 0) return { ok: false, error: "Fakturan finns inte." };
  revalidatePath(`/foretag/${company.id}/kundfakturor`);
  return { ok: true };
}
