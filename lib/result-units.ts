import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { resultUnits } from "@/lib/db/schema";

export type ResultUnit = {
  id: string;
  code: string;
  name: string;
};

export async function listResultUnits(companyId: string): Promise<ResultUnit[]> {
  return db
    .select({
      id: resultUnits.id,
      code: resultUnits.code,
      name: resultUnits.name,
    })
    .from(resultUnits)
    .where(eq(resultUnits.companyId, companyId))
    .orderBy(asc(resultUnits.code));
}

export function parseResultUnitInput(input: {
  code: string;
  name: string;
}):
  | { ok: true; value: { code: string; name: string } }
  | { ok: false; error: string } {
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code) return { ok: false, error: "Fyll i resultatenhet." };
  if (!name) return { ok: false, error: "Fyll i namn." };
  return { ok: true, value: { code, name } };
}

export async function getResultUnitForCompany(
  companyId: string,
  resultUnitId: string
): Promise<ResultUnit | null> {
  const rows = await db
    .select({
      id: resultUnits.id,
      code: resultUnits.code,
      name: resultUnits.name,
    })
    .from(resultUnits)
    .where(
      and(eq(resultUnits.companyId, companyId), eq(resultUnits.id, resultUnitId))
    )
    .limit(1);
  return rows[0] ?? null;
}
