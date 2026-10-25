"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { seedCompanyBooks } from "@/lib/db/seed-company-books";
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

  if (!name) {
    return { error: "Fyll i företagets namn." };
  }
  if (!isValidOrgNumber(orgNumber)) {
    return {
      error: "Organisationsnumret ska ha formatet NNNNNN-NNNN, t.ex. 556036-0793.",
    };
  }

  try {
    await db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({ name, orgNumber })
        .returning({ id: companies.id });
      await seedCompanyBooks(tx, company.id);
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
