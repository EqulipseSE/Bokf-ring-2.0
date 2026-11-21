"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { supplierInvoices } from "@/lib/db/schema";

export async function setSupplierInvoicePaymentDate(
  companyId: string,
  invoiceId: string,
  value: string
): Promise<{ ok: true } | { ok: false; error: string }> {
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
    .update(supplierInvoices)
    .set({ paymentDate })
    .where(and(eq(supplierInvoices.companyId, company.id), eq(supplierInvoices.id, invoiceId)))
    .returning({ id: supplierInvoices.id });
  if (updated.length === 0) return { ok: false, error: "Fakturan finns inte." };

  revalidatePath(`/foretag/${company.id}/leverantorsfakturor`);
  return { ok: true };
}
