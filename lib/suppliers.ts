import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";

export async function listSuppliers(companyId: string) {
  return db
    .select({
      id: suppliers.id,
      number: suppliers.number,
      name: suppliers.name,
      paymentDays: suppliers.paymentDays,
      costAccount: suppliers.costAccount,
    })
    .from(suppliers)
    .where(eq(suppliers.companyId, companyId))
    .orderBy(suppliers.number);
}
