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

export type UpdateCompanyState = { error: string } | { ok: true } | null;

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

  try {
    await db
      .update(companies)
      .set({
        name,
        orgNumber,
        vatPeriod: vatPeriod.value,
        accountingMethod: accountingMethod.value,
      })
      .where(eq(companies.id, company.id));
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
