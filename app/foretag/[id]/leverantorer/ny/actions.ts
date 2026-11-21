"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";

export type SaveSupplierResult = { ok: true } | { ok: false; error: string };

export async function createSupplier(
  companyId: string,
  draft: { number: string; name: string; paymentDays: number; costAccount: string }
): Promise<SaveSupplierResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const number = draft.number.trim().padStart(3, "0");
  const name = draft.name.trim();
  const costAccount = draft.costAccount.trim() || "0";
  if (!/^\d+$/.test(number)) return { ok: false, error: "Leverantörsnumret ska vara siffror." };
  if (!name) return { ok: false, error: "Ange ett namn." };
  if (!/^\d+$/.test(costAccount)) return { ok: false, error: "Kostnadskontot ska vara siffror. 0 betyder att du fördelar själv." };
  if (!Number.isInteger(draft.paymentDays) || draft.paymentDays < 0) {
    return { ok: false, error: "Betalningsvillkor ska vara ett antal dagar." };
  }

  const [existing] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.companyId, companyId), eq(suppliers.number, number)));
  if (existing) return { ok: false, error: "Leverantörsnumret finns redan." };

  await db.insert(suppliers).values({
    companyId,
    number,
    name,
    paymentDays: draft.paymentDays,
    costAccount,
  });
  revalidatePath(`/foretag/${companyId}/leverantorer`);
  return { ok: true };
}
