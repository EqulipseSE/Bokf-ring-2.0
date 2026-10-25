"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

export type SetAccountActiveResult =
  | { ok: true; active: boolean }
  | { ok: false; error: string };

export async function setAccountActive(
  companyId: string,
  accountId: string,
  active: boolean
): Promise<SetAccountActiveResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  const [updated] = await db
    .update(accounts)
    .set({ active })
    .where(and(eq(accounts.id, accountId), eq(accounts.companyId, company.id)))
    .returning({ id: accounts.id, active: accounts.active });

  if (!updated) {
    return { ok: false, error: "Kontot finns inte." };
  }

  revalidatePath(`/foretag/${company.id}/kontoplan`);
  revalidatePath(`/foretag/${company.id}/verifikationer/ny`);
  return { ok: true, active: updated.active };
}
