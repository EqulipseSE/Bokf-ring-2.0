"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { resultUnits } from "@/lib/db/schema";
import {
  getResultUnitForCompany,
  parseResultUnitInput,
} from "@/lib/result-units";

export type ResultUnitActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireCompany(companyId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return null;
  return company;
}

function revalidateResultUnits(companyId: string) {
  revalidatePath(`/foretag/${companyId}/foretagsinstallningar`);
}

export async function createResultUnit(
  companyId: string,
  input: { code: string; name: string }
): Promise<ResultUnitActionResult> {
  const company = await requireCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const parsed = parseResultUnitInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await db.insert(resultUnits).values({
      companyId: company.id,
      code: parsed.value.code,
      name: parsed.value.name,
    });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, error: "Resultatenheten finns redan." };
    }
    throw err;
  }

  revalidateResultUnits(company.id);
  return { ok: true };
}

export async function updateResultUnit(
  companyId: string,
  resultUnitId: string,
  input: { code: string; name: string }
): Promise<ResultUnitActionResult> {
  const company = await requireCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const existing = await getResultUnitForCompany(company.id, resultUnitId);
  if (!existing) return { ok: false, error: "Resultatenheten finns inte." };

  const parsed = parseResultUnitInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await db
      .update(resultUnits)
      .set({
        code: parsed.value.code,
        name: parsed.value.name,
      })
      .where(
        and(
          eq(resultUnits.companyId, company.id),
          eq(resultUnits.id, resultUnitId)
        )
      );
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, error: "Resultatenheten finns redan." };
    }
    throw err;
  }

  revalidateResultUnits(company.id);
  return { ok: true };
}

export async function deleteResultUnit(
  companyId: string,
  resultUnitId: string
): Promise<ResultUnitActionResult> {
  const company = await requireCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const existing = await getResultUnitForCompany(company.id, resultUnitId);
  if (!existing) return { ok: false, error: "Resultatenheten finns inte." };

  await db
    .delete(resultUnits)
    .where(
      and(
        eq(resultUnits.companyId, company.id),
        eq(resultUnits.id, resultUnitId)
      )
    );

  revalidateResultUnits(company.id);
  return { ok: true };
}
