import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplierInvoices, suppliers } from "@/lib/db/schema";

/** Kopplar fakturan till en leverantör med samma namn, eller skapar en ny. */
export async function ensureInvoiceSupplier(
  companyId: string,
  invoiceId: string,
  name: string,
  costAccount: string
): Promise<{ id: string; number: string; name: string } | null> {
  const supplierName = name.trim();
  if (!supplierName) return null;

  const rows = await db
    .select({ id: suppliers.id, number: suppliers.number, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.companyId, companyId));
  const wanted = supplierName.toLocaleLowerCase("sv");
  const existing = rows.find((row) => row.name.toLocaleLowerCase("sv") === wanted);
  if (existing) {
    await db
      .update(supplierInvoices)
      .set({ supplierId: existing.id, supplierNumber: existing.number, supplierName: existing.name })
      .where(and(eq(supplierInvoices.companyId, companyId), eq(supplierInvoices.id, invoiceId)));
    return existing;
  }

  const next = rows.reduce((max, row) => Math.max(max, Number(row.number) || 0), 0) + 1;
  const number = String(next).padStart(3, "0");
  const [created] = await db
    .insert(suppliers)
    .values({
      companyId,
      number,
      name: supplierName,
      paymentDays: 30,
      costAccount: costAccount || "0",
    })
    .returning({ id: suppliers.id, number: suppliers.number, name: suppliers.name });
  if (!created) return null;
  await db
    .update(supplierInvoices)
    .set({ supplierId: created.id, supplierNumber: created.number, supplierName: created.name })
    .where(and(eq(supplierInvoices.companyId, companyId), eq(supplierInvoices.id, invoiceId)));
  return created;
}
