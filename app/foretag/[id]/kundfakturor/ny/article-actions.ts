"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { parseVatCode } from "@/lib/vat-codes";

export type SavedArticle = {
  id: string;
  number: string;
  name: string;
  unit: string;
  unitPrice: string;
  accountNumber: string;
  vatCode: string;
};

export type SaveArticleResult =
  | { ok: true; article: SavedArticle }
  | { ok: false; error: string };

const UNITS = new Set(["", "St", "Tim"]);

function parseArticleInput(input: {
  number: string;
  name: string;
  unit: string;
  unitPrice: string;
  accountNumber: string;
  vatCode: string;
}):
  | {
      ok: true;
      number: string;
      name: string;
      unit: string | null;
      unitPrice: string | null;
      accountNumber: string | null;
      vatCode: string | null;
    }
  | { ok: false; error: string } {
  const number = input.number.trim();
  const name = input.name.trim();
  const unit = input.unit.trim();
  const unitPrice = input.unitPrice.trim();
  const accountNumber = input.accountNumber.trim();
  if (!number) return { ok: false, error: "Ange ett artikelnummer." };
  if (!name) return { ok: false, error: "Ange en benämning." };
  if (!UNITS.has(unit)) return { ok: false, error: "Ogiltig enhet." };
  const vat = parseVatCode(input.vatCode);
  if (!vat.ok) return vat;
  return {
    ok: true,
    number,
    name,
    unit: unit || null,
    unitPrice: unitPrice || null,
    accountNumber: accountNumber || null,
    vatCode: vat.code,
  };
}

function isDuplicateNumber(err: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = err;
  for (let i = 0; i < 4 && current; i += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    if (typeof current === "object" && current && "code" in current) {
      parts.push(String((current as { code: unknown }).code));
    }
    break;
  }
  const text = parts.join(" ");
  return text.includes("23505") || text.includes("articles_company_number");
}

function toSaved(row: {
  id: string;
  number: string;
  name: string;
  unit: string | null;
  unitPrice: string | null;
  accountNumber: string | null;
  vatCode: string | null;
}): SavedArticle {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    unit: row.unit ?? "",
    unitPrice: row.unitPrice ?? "",
    accountNumber: row.accountNumber ?? "",
    vatCode: row.vatCode ?? "",
  };
}

export async function createArticle(
  companyId: string,
  input: {
    number: string;
    name: string;
    unit: string;
    unitPrice: string;
    accountNumber: string;
    vatCode: string;
  }
): Promise<SaveArticleResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const parsed = parseArticleInput(input);
  if (!parsed.ok) return parsed;

  try {
    const [created] = await db
      .insert(articles)
      .values({
        companyId: company.id,
        number: parsed.number,
        name: parsed.name,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        accountNumber: parsed.accountNumber,
        vatCode: parsed.vatCode,
      })
      .returning();
    revalidatePath(`/foretag/${company.id}/kundfakturor/ny`);
    return { ok: true, article: toSaved(created) };
  } catch (err) {
    if (isDuplicateNumber(err)) {
      return { ok: false, error: "Artikelnumret finns redan." };
    }
    throw err;
  }
}

export async function updateArticle(
  companyId: string,
  articleId: string,
  input: {
    number: string;
    name: string;
    unit: string;
    unitPrice: string;
    accountNumber: string;
    vatCode: string;
  }
): Promise<SaveArticleResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const parsed = parseArticleInput(input);
  if (!parsed.ok) return parsed;

  try {
    const [updated] = await db
      .update(articles)
      .set({
        number: parsed.number,
        name: parsed.name,
        unit: parsed.unit,
        unitPrice: parsed.unitPrice,
        accountNumber: parsed.accountNumber,
        vatCode: parsed.vatCode,
      })
      .where(and(eq(articles.id, articleId), eq(articles.companyId, company.id)))
      .returning();
    if (!updated) return { ok: false, error: "Artikeln finns inte." };
    revalidatePath(`/foretag/${company.id}/kundfakturor/ny`);
    return { ok: true, article: toSaved(updated) };
  } catch (err) {
    if (isDuplicateNumber(err)) {
      return { ok: false, error: "Artikelnumret finns redan." };
    }
    throw err;
  }
}
