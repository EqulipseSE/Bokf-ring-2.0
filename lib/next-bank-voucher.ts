import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { textFromPdfBytes } from "@/lib/document-sort";
import { db } from "@/lib/db";
import { articles, bankAccounts, bankTransactions, companies, companyDocuments, supplierInvoices } from "@/lib/db/schema";
import { readCompanyDocument } from "@/lib/company-documents";
import { matchSupplierInvoice } from "@/lib/supplier-invoice-match";
import { extractPdfRuns } from "@/lib/pdf-runs";
import { salaryPostings } from "@/lib/salary-postings";
import { suggestedPostings, type SuggestedPosting } from "@/lib/voucher-suggestion";

export type NextVoucherTransaction = {
  id: string;
  date: string;
  text: string;
  amountOre: number;
  bookAccountNumber: string;
  document: { id: string; name: string; mimeType: string; link: boolean } | null;
  postings: SuggestedPosting[];
};

const SKIP_NAME = /^(faktura|underlag|test|pdf|lon|lön|kvitto)$/i;

function nameTokens(fileName: string): string[] {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLocaleLowerCase("sv")
    .split(/[^a-zåäö0-9]+/i)
    .filter((word) => word.length >= 4 && !SKIP_NAME.test(word) && !/^\d+$/.test(word));
}

function salaryDate(fileName: string): string | null {
  const match = fileName.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export async function nextUnbookedTransaction(
  companyId: string,
  afterId: string | null
): Promise<NextVoucherTransaction | null> {
  const rows = await db
    .select()
    .from(bankTransactions)
    .where(and(eq(bankTransactions.companyId, companyId), isNull(bankTransactions.voucherId)))
    .orderBy(asc(bankTransactions.bookedDate), asc(bankTransactions.entryReference));
  if (rows.length === 0) return null;
  const start = afterId ? rows.findIndex((row) => row.id === afterId) + 1 : 0;
  const transaction = rows[start] ?? null;
  if (!transaction) return null;

  const [bankAccount] = await db
    .select({ bookAccountNumber: bankAccounts.bookAccountNumber })
    .from(bankAccounts)
    .where(
      and(eq(bankAccounts.companyId, companyId), eq(bankAccounts.accountUid, transaction.accountUid))
    )
    .limit(1);

  const documents = await db
    .select()
    .from(companyDocuments)
    .where(and(eq(companyDocuments.companyId, companyId), isNull(companyDocuments.deletedAt), isNull(companyDocuments.voucherId)));

  const reference = (transaction.referenceNumber ?? "").replace(/\s/g, "");
  const description = transaction.description.toLocaleLowerCase("sv");
  const matches = (document: (typeof documents)[number], text = "") => {
    if (reference.length >= 4 && document.originalName.includes(reference)) return true;
    if (reference.length >= 4 && text.includes(reference)) return true;
    if (salaryDate(document.originalName) === transaction.bookedDate) return true;
    return nameTokens(document.originalName).some((token) => description.includes(token));
  };
  let match = documents.find((document) => matches(document));
  let text = "";
  let stored: Uint8Array | null = null;
  if (!match && reference.length >= 4) {
    for (const document of documents) {
      if (document.mimeType !== "application/pdf") continue;
      const file = await readCompanyDocument(companyId, document.id);
      if (!file) continue;
      const extracted = textFromPdfBytes(file.stored);
      if (extracted.includes(reference)) {
        match = document;
        text = extracted;
        break;
      }
    }
  }
  if (match && !text && match.mimeType === "application/pdf") {
    const file = await readCompanyDocument(companyId, match.id);
    if (file) {
      stored = file.stored;
      text = textFromPdfBytes(file.stored);
    }
  }

  const articleRows = await db
    .select({ name: articles.name, accountNumber: articles.accountNumber })
    .from(articles)
    .where(eq(articles.companyId, companyId));
  const haystack = text.toLocaleLowerCase("sv");
  const revenue = articleRows.find(
    (article) =>
      article.accountNumber &&
      article.name.trim().length >= 4 &&
      haystack.includes(article.name.trim().toLocaleLowerCase("sv"))
  );

  const [company] = await db
    .select({ accountingMethod: companies.accountingMethod })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const accountingMethod = company?.accountingMethod === "kontant" ? "kontant" : "faktura";
  const bookAccountNumber = bankAccount?.bookAccountNumber || "1930";

  const invoiceRows = await db
    .select({
      id: supplierInvoices.id,
      supplierName: supplierInvoices.supplierName,
      invoiceNumber: supplierInvoices.invoiceNumber,
      totalOre: supplierInvoices.totalOre,
      paymentDate: supplierInvoices.paymentDate,
      documentId: supplierInvoices.documentId,
    })
    .from(supplierInvoices)
    .where(eq(supplierInvoices.companyId, companyId));
  const supplierParts = matchSupplierInvoice(
    {
      amountOre: transaction.amountOre,
      description: transaction.description,
      referenceNumber: transaction.referenceNumber,
    },
    invoiceRows
  );
  if (supplierParts && accountingMethod === "faktura" && transaction.amountOre < 0) {
    const documentId = [...supplierParts].reverse().find((part) => part.invoice.documentId)?.invoice.documentId;
    const [invoiceDocument] = documentId
      ? await db
          .select({
            id: companyDocuments.id,
            name: companyDocuments.originalName,
            mimeType: companyDocuments.mimeType,
          })
          .from(companyDocuments)
          .where(eq(companyDocuments.id, documentId))
          .limit(1)
      : [];
    const described = supplierParts
      .map((part) => `${part.invoice.supplierName} ${part.invoice.invoiceNumber}`)
      .join("\n");
    return {
      id: transaction.id,
      date: transaction.bookedDate,
      text: transaction.description.trim() || "Transaktion",
      amountOre: transaction.amountOre,
      bookAccountNumber,
      document: invoiceDocument ? { ...invoiceDocument, link: false } : null,
      postings: supplierParts.flatMap((part) =>
        suggestedPostings({
          kind: "leverantorsfaktura",
          text: `${transaction.description}\n${described}`,
          revenueAccount: null,
          grossOre: part.ore,
          accountingMethod,
          backedBySupplierInvoice: true,
        })
      ),
    };
  }

  const salary =
    match?.kind === "lon" && stored
      ? salaryPostings(extractPdfRuns(stored), bookAccountNumber)
      : [];
  const postings =
    salary.length > 0
      ? salary
      : match
        ? suggestedPostings({
            kind: match.kind,
            text: `${transaction.description}\n${text}`,
            revenueAccount: revenue?.accountNumber ?? null,
            grossOre: Math.abs(transaction.amountOre),
            accountingMethod,
          })
        : [];

  return {
    id: transaction.id,
    date: transaction.bookedDate,
    text: transaction.description.trim() || "Transaktion",
    amountOre: transaction.amountOre,
    bookAccountNumber,
    document: match
      ? { id: match.id, name: match.originalName, mimeType: match.mimeType, link: true }
      : null,
    postings,
  };
}
