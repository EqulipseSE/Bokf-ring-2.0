"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountsForBasChart, parseBasChart } from "@/lib/db/bas-accounts";
import { companies } from "@/lib/db/schema";
import { seedCompanyBooks } from "@/lib/db/seed-company-books";
import {
  parseAccountingMethod,
  parseLegalForm,
  parseVatPeriodKind,
} from "@/lib/company-settings";
import { lookupOrganisation } from "@/lib/bolagsverket";
import { isValidOrgNumber } from "@/lib/organisationsnummer";

export type CreateCompanyState = { error: string } | null;

export type CompanyLookupState =
  | { name: string; legalForm: "ab" | "ef" | null; legalFormLabel: string }
  | { error: string };

export async function fetchCompany(
  orgNumber: string
): Promise<CompanyLookupState> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  return lookupOrganisation(orgNumber);
}

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const name = String(formData.get("name") ?? "").trim();
  const orgNumber = String(formData.get("orgNumber") ?? "").trim();
  if (!name) {
    return { error: "Fyll i företagets namn." };
  }
  if (!isValidOrgNumber(orgNumber)) {
    return {
      error: "Organisationsnumret ska ha formatet NNNNNN-NNNN, t.ex. 556036-0793.",
    };
  }
  const chart = parseBasChart(formData.get("chart"));
  if (!chart.ok) return { error: chart.error };
  const vatPeriod = parseVatPeriodKind(formData.get("vatPeriod"));
  if (!vatPeriod.ok) return { error: vatPeriod.error };
  const accountingMethod = parseAccountingMethod(
    formData.get("accountingMethod")
  );
  if (!accountingMethod.ok) return { error: accountingMethod.error };
  const legalForm = parseLegalForm(formData.get("legalForm"));
  if (!legalForm.ok) return { error: legalForm.error };

  try {
    await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({
          name,
          orgNumber,
          vatPeriod: vatPeriod.value,
          accountingMethod: accountingMethod.value,
          legalForm: legalForm.value,
        })
        .returning({ id: companies.id });
      await seedCompanyBooks(tx, company.id, accountsForBasChart(chart.value), accountingMethod.value);
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
    if (isDatabaseUnavailable(err)) {
      return {
        error: "Företaget kan inte sparas ännu. Databasen är inte igång.",
      };
    }
    throw err;
  }

  redirect("/klientforetag");
}

function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof AggregateError) {
    return err.errors.some((item) => isDatabaseUnavailable(item));
  }
  if (err instanceof Error && err.cause && isDatabaseUnavailable(err.cause)) {
    return true;
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code);
    return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET";
  }
  return false;
}
