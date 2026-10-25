import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { ensureCompanyBooks } from "@/lib/db/seed-company-books";
import { accounts, companies, type Account, type Company } from "@/lib/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hämtar ett klientföretag, eller null om id är ogiltigt eller saknas. */
export const getCompany = cache(async (id: string): Promise<Company | null> => {
  if (!UUID_REGEX.test(id)) return null;
  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return result[0] ?? null;
});

/** Alla konton i företagets kontoplan, även inaktiva. */
export async function listCompanyChart(companyId: string): Promise<Account[]> {
  await ensureCompanyBooks(companyId);
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.companyId, companyId))
    .orderBy(accounts.number);
}
