import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, type Article } from "@/lib/db/schema";

export async function listArticles(companyId: string): Promise<Article[]> {
  return db
    .select()
    .from(articles)
    .where(eq(articles.companyId, companyId))
    .orderBy(asc(articles.number));
}
