"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { writeOffs } from "@/lib/db/schema";
import {
  getWriteOffForCompany,
  parseWriteOffInput,
} from "@/lib/write-offs";

export type WriteOffActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireCompany(companyId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return null;
  return company;
}

function revalidateWriteOffs(companyId: string) {
  revalidatePath(`/foretag/${companyId}/foretagsinstallningar`);
}

export async function createWriteOff(
  companyId: string,
  input: { code: string; text: string; accountNumber: string }
): Promise<WriteOffActionResult> {
  const company = await requireCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const parsed = parseWriteOffInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await db.insert(writeOffs).values({
      companyId: company.id,
      code: parsed.value.code,
      text: parsed.value.text,
      accountNumber: parsed.value.accountNumber,
    });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, error: "Koden finns redan." };
    }
    throw err;
  }

  revalidateWriteOffs(company.id);
  return { ok: true };
}

export async function updateWriteOff(
  companyId: string,
  writeOffId: string,
  input: { code: string; text: string; accountNumber: string }
): Promise<WriteOffActionResult> {
  const company = await requireCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const existing = await getWriteOffForCompany(company.id, writeOffId);
  if (!existing) return { ok: false, error: "Bortskrivningen finns inte." };

  const parsed = parseWriteOffInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await db
      .update(writeOffs)
      .set({
        code: parsed.value.code,
        text: parsed.value.text,
        accountNumber: parsed.value.accountNumber,
      })
      .where(
        and(eq(writeOffs.companyId, company.id), eq(writeOffs.id, writeOffId))
      );
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      return { ok: false, error: "Koden finns redan." };
    }
    throw err;
  }

  revalidateWriteOffs(company.id);
  return { ok: true };
}

export async function deleteWriteOff(
  companyId: string,
  writeOffId: string
): Promise<WriteOffActionResult> {
  const company = await requireCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const existing = await getWriteOffForCompany(company.id, writeOffId);
  if (!existing) return { ok: false, error: "Bortskrivningen finns inte." };

  await db
    .delete(writeOffs)
    .where(
      and(eq(writeOffs.companyId, company.id), eq(writeOffs.id, writeOffId))
    );

  revalidateWriteOffs(company.id);
  return { ok: true };
}
