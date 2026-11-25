import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { writeOffs } from "@/lib/db/schema";

export type WriteOff = {
  id: string;
  code: string;
  text: string;
  accountNumber: string;
};

/** Standardbortskrivningar (Visma-motsvarighet). Resultatpåverkan kopplas senare. */
export const DEFAULT_WRITE_OFFS = [
  { code: "AVG", text: "Avgifter", accountNumber: "3540" },
  { code: "AVR", text: "Avrundning", accountNumber: "3740" },
  { code: "KFÖRL", text: "Kundförlust", accountNumber: "6352" },
  { code: "MKF", text: "Moms kundförlust", accountNumber: "2611" },
  { code: "RAB", text: "Rabatter", accountNumber: "3731" },
] as const;

export async function listWriteOffs(companyId: string): Promise<WriteOff[]> {
  await ensureWriteOffs(companyId);
  const rows = await db
    .select({
      id: writeOffs.id,
      code: writeOffs.code,
      text: writeOffs.text,
      accountNumber: writeOffs.accountNumber,
    })
    .from(writeOffs)
    .where(eq(writeOffs.companyId, companyId))
    .orderBy(asc(writeOffs.code));
  return rows;
}

export async function ensureWriteOffs(companyId: string): Promise<void> {
  const existing = await db
    .select({ id: writeOffs.id })
    .from(writeOffs)
    .where(eq(writeOffs.companyId, companyId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(writeOffs).values(
    DEFAULT_WRITE_OFFS.map((row) => ({
      companyId,
      code: row.code,
      text: row.text,
      accountNumber: row.accountNumber,
    }))
  );
}

export function parseWriteOffInput(input: {
  code: string;
  text: string;
  accountNumber: string;
}): { ok: true; value: { code: string; text: string; accountNumber: string } } | { ok: false; error: string } {
  const code = input.code.trim().toLocaleUpperCase("sv");
  const text = input.text.trim();
  const accountNumber = input.accountNumber.trim();
  if (!code) return { ok: false, error: "Fyll i kod." };
  if (!text) return { ok: false, error: "Fyll i text." };
  if (!/^\d{4}$/.test(accountNumber)) {
    return { ok: false, error: "Kontot ska vara fyra siffror." };
  }
  return { ok: true, value: { code, text, accountNumber } };
}

export async function getWriteOffForCompany(
  companyId: string,
  writeOffId: string
): Promise<WriteOff | null> {
  const rows = await db
    .select({
      id: writeOffs.id,
      code: writeOffs.code,
      text: writeOffs.text,
      accountNumber: writeOffs.accountNumber,
    })
    .from(writeOffs)
    .where(and(eq(writeOffs.companyId, companyId), eq(writeOffs.id, writeOffId)))
    .limit(1);
  return rows[0] ?? null;
}
