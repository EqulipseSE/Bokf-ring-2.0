"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  parseAccountingMethod,
  parseVatPeriodKind,
} from "@/lib/company-settings";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { isValidOrgNumber } from "@/lib/organisationsnummer";
import { discardInvalidPeriodLock } from "@/lib/period-lock-query";
import { ensureInvoiceMethodSeries } from "@/lib/db/seed-company-books";

export type UpdateCompanyState = { error: string } | { ok: true } | null;

function giroOrNull(value: FormDataEntryValue | null): string | null | false {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d+(-\d+)*$/.test(text)) return false;
  return text;
}

export async function updateCompany(
  companyId: string,
  _prevState: UpdateCompanyState,
  formData: FormData
): Promise<UpdateCompanyState> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(companyId);
  if (!company) {
    return { error: "Företaget finns inte." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const orgNumber = String(formData.get("orgNumber") ?? "").trim();
  if (!name) return { error: "Fyll i företagets namn." };
  if (!isValidOrgNumber(orgNumber)) {
    return {
      error: "Organisationsnumret ska ha formatet NNNNNN-NNNN, t.ex. 556036-0793.",
    };
  }
  const vatPeriod = parseVatPeriodKind(formData.get("vatPeriod"));
  if (!vatPeriod.ok) return { error: vatPeriod.error };
  const accountingMethod = parseAccountingMethod(
    formData.get("accountingMethod")
  );
  if (!accountingMethod.ok) return { error: accountingMethod.error };
  const bankgiro = giroOrNull(formData.get("bankgiro"));
  const plusgiro = giroOrNull(formData.get("plusgiro"));
  if (bankgiro === false || plusgiro === false) {
    return { error: "Bankgiro och plusgiro ska bara innehålla siffror och bindestreck." };
  }

  try {
    await db
      .update(companies)
      .set({
        name,
        orgNumber,
        vatPeriod: vatPeriod.value,
        accountingMethod: accountingMethod.value,
        bankgiro,
        plusgiro,
      })
      .where(eq(companies.id, company.id));
    await discardInvalidPeriodLock(company.id);
    if (accountingMethod.value === "faktura") {
      await ensureInvoiceMethodSeries(company.id);
    }
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return {
        error: "Ett företag med det organisationsnumret finns redan.",
      };
    }
    throw err;
  }

  revalidatePath("/klientforetag");
  revalidatePath(`/foretag/${company.id}`);
  revalidatePath(`/foretag/${company.id}/foretagsinstallningar`);
  revalidatePath(`/foretag/${company.id}/periodlasning`);
  return { ok: true };
}
