import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";

export async function listCustomers(companyId: string, includeHidden = false) {
  return db
    .select({
      id: customers.id,
      number: customers.number,
      name: customers.name,
      customerType: customers.customerType,
      phone: customers.phone,
      address: customers.address,
      postalCode: customers.postalCode,
      city: customers.city,
      hidden: customers.hidden,
    })
    .from(customers)
    .where(
      includeHidden
        ? eq(customers.companyId, companyId)
        : and(eq(customers.companyId, companyId), eq(customers.hidden, false))
    )
    .orderBy(customers.number);
}
