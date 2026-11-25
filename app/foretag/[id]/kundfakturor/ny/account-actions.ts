"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { parseVatCode } from "@/lib/vat-codes";

export type SavedAccount = {
  id: string;
  number: string;
  name: string;
  vatCode: string | null;
  allowsResultUnit: boolean;
};

export type SaveAccountResult =
  | { ok: true; account: SavedAccount }
  | { ok: false; error: string };

function parseAccountInput(input: {
  number: string;
  name: string;
  vatCode: string;
}): { ok: true; number: string; name: string; vatCode: string | null } | { ok: false; error: string } {
  const number = input.number.trim();
  const name = input.name.trim();
  if (!number) return { ok: false, error: "Ange ett kontonummer." };
  if (!name) return { ok: false, error: "Ange ett kontonamn." };
  const vat = parseVatCode(input.vatCode);
  if (!vat.ok) return vat;
  return { ok: true, number, name, vatCode: vat.code };
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
  return text.includes("23505") || text.includes("accounts_company_number");
}

function refresh(companyId: string) {
  revalidatePath(`/foretag/${companyId}/kontoplan`);
  revalidatePath(`/foretag/${companyId}/kundfakturor/ny`);
  revalidatePath(`/foretag/${companyId}/verifikationer/ny`);
}

export async function createAccount(
  companyId: string,
  input: { number: string; name: string; vatCode: string }
): Promise<SaveAccountResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const parsed = parseAccountInput(input);
  if (!parsed.ok) return parsed;

  try {
    const [created] = await db
      .insert(accounts)
      .values({
        companyId: company.id,
        number: parsed.number,
        name: parsed.name,
        vatCode: parsed.vatCode,
      })
      .returning({
        id: accounts.id,
        number: accounts.number,
        name: accounts.name,
        vatCode: accounts.vatCode,
        allowsResultUnit: accounts.allowsResultUnit,
      });
    refresh(company.id);
    return { ok: true, account: created };
  } catch (err) {
    if (isDuplicateNumber(err)) {
      return { ok: false, error: "Kontonumret finns redan." };
    }
    throw err;
  }
}

export async function updateAccount(
  companyId: string,
  accountId: string,
  input: { number: string; name: string; vatCode: string }
): Promise<SaveAccountResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const parsed = parseAccountInput(input);
  if (!parsed.ok) return parsed;

  try {
    const [updated] = await db
      .update(accounts)
      .set({
        number: parsed.number,
        name: parsed.name,
        vatCode: parsed.vatCode,
      })
      .where(and(eq(accounts.id, accountId), eq(accounts.companyId, company.id)))
      .returning({
        id: accounts.id,
        number: accounts.number,
        name: accounts.name,
        vatCode: accounts.vatCode,
        allowsResultUnit: accounts.allowsResultUnit,
      });
    if (!updated) return { ok: false, error: "Kontot finns inte." };
    refresh(company.id);
    return { ok: true, account: updated };
  } catch (err) {
    if (isDuplicateNumber(err)) {
      return { ok: false, error: "Kontonumret finns redan." };
    }
    throw err;
  }
}
