import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  bankTransactions,
  companyDocuments,
  supplierInvoiceLines,
  supplierInvoices,
} from "@/lib/db/schema";
import { textFromPdfBytes } from "@/lib/document-sort";
import { proposeSupplierInvoice } from "@/lib/supplier-invoice-proposal";

const ROOT = path.resolve(process.cwd(), "data", "underlag");

/** Läser olänkade leverantörsfakturor och lägger dem som preliminära förslag. */
export async function importPreliminarySupplierInvoices(companyId: string): Promise<void> {
  const documents = await db
    .select({
      id: companyDocuments.id,
      originalName: companyDocuments.originalName,
      storagePath: companyDocuments.storagePath,
      invoiceNumber: companyDocuments.invoiceNumber,
      totalOre: companyDocuments.totalOre,
    })
    .from(companyDocuments)
    .where(
      and(
        eq(companyDocuments.companyId, companyId),
        eq(companyDocuments.kind, "leverantorsfaktura"),
        isNull(companyDocuments.deletedAt)
      )
    );
  if (documents.length === 0) return;

  const linked = await db
    .select({
      documentId: supplierInvoices.documentId,
      supplierName: supplierInvoices.supplierName,
      invoiceNumber: supplierInvoices.invoiceNumber,
      totalOre: supplierInvoices.totalOre,
    })
    .from(supplierInvoices)
    .where(eq(supplierInvoices.companyId, companyId));
  const linkedIds = new Set(linked.map((row) => row.documentId).filter(Boolean));
  const existing = linked.map((row) => ({
    supplierName: row.supplierName,
    invoiceNumber: row.invoiceNumber,
    totalOre: row.totalOre,
  }));
  const pending = documents.filter((document) => !linkedIds.has(document.id));
  if (pending.length === 0) return;

  const payments = await db
    .select({
      date: bankTransactions.bookedDate,
      amountOre: bankTransactions.amountOre,
      referenceNumber: bankTransactions.referenceNumber,
      description: bankTransactions.description,
    })
    .from(bankTransactions)
    .where(eq(bankTransactions.companyId, companyId));

  const chart = await db
    .select({ id: accounts.id, number: accounts.number })
    .from(accounts)
    .where(eq(accounts.companyId, companyId));
  const accountId = new Map(chart.map((account) => [account.number, account.id]));

  const [latest] = await db
    .select({ levfakturaNumber: supplierInvoices.levfakturaNumber })
    .from(supplierInvoices)
    .where(eq(supplierInvoices.companyId, companyId))
    .orderBy(desc(supplierInvoices.levfakturaNumber))
    .limit(1);
  let nextNumber = (latest?.levfakturaNumber ?? 0) + 1;

  for (const document of pending) {
    const absolute = path.resolve(ROOT, document.storagePath);
    if (!absolute.startsWith(ROOT + path.sep)) continue;
    const bytes = await readFile(absolute).catch(() => null);
    const text =
      bytes && document.originalName.toLowerCase().endsWith(".pdf") ? textFromPdfBytes(bytes) : "";
    const proposal = proposeSupplierInvoice(
      {
        documentId: document.id,
        fileName: document.originalName,
        text,
        invoiceNumber: document.invoiceNumber,
        totalOre: document.totalOre,
      },
      payments,
      existing
    );
    if (!proposal) continue;
    existing.push({
      supplierName: proposal.supplierName,
      invoiceNumber: proposal.invoiceNumber,
      totalOre: proposal.totalOre,
    });

    const [created] = await db
      .insert(supplierInvoices)
      .values({
        companyId,
        supplierName: proposal.supplierName,
        invoiceNumber: proposal.invoiceNumber,
        invoiceDate: proposal.invoiceDate,
        dueDate: proposal.dueDate,
        paymentDate: proposal.paymentDate,
        totalOre: proposal.totalOre,
        vatOre: proposal.vatOre,
        freightOre: 0,
        status: "preliminar",
        documentId: proposal.documentId,
        levfakturaNumber: nextNumber,
      })
      .returning({ id: supplierInvoices.id });
    if (!created) continue;
    nextNumber += 1;

    const posted = proposal.lines ?? [
      {
        accountNumber: proposal.costAccount,
        debitOre: proposal.netOre,
        creditOre: 0,
      },
      ...(proposal.vatOre > 0
        ? [{ accountNumber: "2641", debitOre: proposal.vatOre, creditOre: 0 }]
        : []),
    ];
    await db.insert(supplierInvoiceLines).values(
      posted.map((line, index) => ({
        invoiceId: created.id,
        lineNumber: index + 1,
        accountId: accountId.get(line.accountNumber) ?? null,
        accountNumber: line.accountNumber,
        debitOre: line.debitOre,
        creditOre: line.creditOre,
      }))
    );
  }
}
