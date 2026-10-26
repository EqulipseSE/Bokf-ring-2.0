"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAccountDrafts } from "@/lib/db/bas-accounts";
import { companies } from "@/lib/db/schema";
import { seedCompanyBooks } from "@/lib/db/seed-company-books";
import {
  parseAccountingMethod,
  parseVatPeriodKind,
} from "@/lib/company-settings";
import { isValidOrgNumber } from "@/lib/organisationsnummer";

export type CreateCompanyState = { error: string } | null;

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const name = String(formData.get("name") ?? "").trim();
  const orgNumber = String(formData.get("orgNumber") ?? "").trim();
  const parsedAccounts = parseAccountDrafts(
    String(formData.get("accounts") ?? "")
  );

  if (!name) {
    return { error: "Fyll i företagets namn." };
  }
  if (!isValidOrgNumber(orgNumber)) {
    return {
      error: "Organisationsnumret ska ha formatet NNNNNN-NNNN, t.ex. 556036-0793.",
    };
  }
  if ("error" in parsedAccounts) {
    return { error: parsedAccounts.error };
  }
  const vatPeriod = parseVatPeriodKind(formData.get("vatPeriod"));
  if (!vatPeriod.ok) return { error: vatPeriod.error };
  const accountingMethod = parseAccountingMethod(
    formData.get("accountingMethod")
  );
  if (!accountingMethod.ok) return { error: accountingMethod.error };

  try {
    await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({
          name,
          orgNumber,
          vatPeriod: vatPeriod.value,
          accountingMethod: accountingMethod.value,
        })
        .returning({ id: companies.id });
      await seedCompanyBooks(tx, company.id, parsedAccounts.accounts);
    });
  } catch (err) {
    // 23505 = unique_violation i Postgres (organisationsnumret finns redan).
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

  redirect("/klientforetag");
}
