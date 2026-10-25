import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { companies, type Company } from "@/lib/db/schema";

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
