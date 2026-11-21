"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";

export async function setCustomerHidden(companyId: string, customerId: string, hidden: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return;

  await db
    .update(customers)
    .set({ hidden })
    .where(and(eq(customers.id, customerId), eq(customers.companyId, company.id)));
  revalidatePath(`/foretag/${company.id}/kunder`);
}
