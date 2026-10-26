"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { savePeriodLock } from "@/lib/period-lock-query";

export type LockPeriodResult =
  | { ok: true; lockedThrough: string }
  | { ok: false; error: string };

export async function lockPeriod(
  companyId: string,
  lockedThrough: string
): Promise<LockPeriodResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const company = await getCompany(companyId);
  if (!company) {
    return { ok: false, error: "Företaget finns inte." };
  }

  const result = await savePeriodLock(company.id, user.id, lockedThrough);
  if (!result.ok) return result;

  revalidatePath(`/foretag/${company.id}/periodlasning`);
  revalidatePath(`/foretag/${company.id}/verifikationer`);
  revalidatePath(`/foretag/${company.id}/verifikationer/ny`);
  revalidatePath(`/foretag/${company.id}/kontoplan`);
  return result;
}
