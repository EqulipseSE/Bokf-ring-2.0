"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";

const AGREEMENT_MAX_BYTES = 8 * 1024 * 1024;
const AGREEMENT_ROOT = path.resolve(process.cwd(), "data", "avtal");
const PAYMENT_DAYS = new Set([0, 10, 15, 20, 30, 60]);
const TYPES = new Set(["foretag", "privatperson"]);
const DELIVERIES = new Set(["epost", "utskrift"]);

export type SaveCustomerResult = { ok: true } | { ok: false; error: string };

function textOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function digitsOrNull(value: FormDataEntryValue | null): string | null | false {
  const text = textOrNull(value);
  if (!text) return null;
  if (!/^\d+(-\d+)*$/.test(text)) return false;
  return text;
}

export async function createCustomer(
  companyId: string,
  formData: FormData
): Promise<SaveCustomerResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const name = textOrNull(formData.get("name"));
  if (!name) return { ok: false, error: "Ange ett namn." };

  const identityNumber = textOrNull(formData.get("identityNumber"));
  if (identityNumber && !/^\d{6}-\d{4}$/.test(identityNumber)) {
    return { ok: false, error: "Org/persnr ska anges som xxxxxx-xxxx." };
  }

  const customerType = textOrNull(formData.get("customerType")) ?? "";
  if (!TYPES.has(customerType)) return { ok: false, error: "Välj typ av kund." };

  const paymentDays = Number(textOrNull(formData.get("paymentDays")));
  if (!PAYMENT_DAYS.has(paymentDays)) {
    return { ok: false, error: "Välj betalningsvillkor." };
  }

  const invoiceDelivery = textOrNull(formData.get("invoiceDelivery")) ?? "";
  if (!DELIVERIES.has(invoiceDelivery)) return { ok: false, error: "Välj fakturaval." };

  const bankgiro = digitsOrNull(formData.get("bankgiro"));
  const plusgiro = digitsOrNull(formData.get("plusgiro"));
  if (bankgiro === false || plusgiro === false) {
    return { ok: false, error: "Bankgiro och plusgiro får bara innehålla siffror och bindestreck." };
  }

  const agreement = formData.get("agreement");
  const file = agreement instanceof File && agreement.size > 0 ? agreement : null;
  if (file && file.size > AGREEMENT_MAX_BYTES) {
    return { ok: false, error: "Avtalet får vara högst 8 MB." };
  }

  const existing = await db
    .select({ number: customers.number })
    .from(customers)
    .where(eq(customers.companyId, company.id));
  const nextNumber =
    existing.reduce((max, row) => Math.max(max, Number(row.number) || 0), 0) + 1;

  const [created] = await db
    .insert(customers)
    .values({
      companyId: company.id,
      number: String(nextNumber),
      name,
      identityNumber,
      customerType,
      address: textOrNull(formData.get("address")),
      postalCode: textOrNull(formData.get("postalCode")),
      city: textOrNull(formData.get("city")),
      vatNumber: textOrNull(formData.get("vatNumber")),
      phone: textOrNull(formData.get("phone")),
      email: textOrNull(formData.get("email")),
      note: textOrNull(formData.get("note")),
      paymentDays,
      receivableAccount: textOrNull(formData.get("accountNumber")),
      invoiceDelivery,
      bankgiro,
      plusgiro,
      discount: textOrNull(formData.get("discount")),
    })
    .returning({ id: customers.id });

  if (file) {
    try {
      const safeName = path.basename(file.name).replace(/[^\w.\- ()åäöÅÄÖ]+/g, "_") || "avtal";
      const relativePath = path.posix.join(company.id, created.id, safeName);
      const absoluteDir = path.join(AGREEMENT_ROOT, company.id, created.id);
      const absolutePath = path.join(absoluteDir, safeName);
      if (!absolutePath.startsWith(AGREEMENT_ROOT + path.sep)) {
        throw new Error("path");
      }
      await mkdir(absoluteDir, { recursive: true });
      await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
      await db
        .update(customers)
        .set({ agreementName: file.name, agreementPath: relativePath })
        .where(eq(customers.id, created.id));
    } catch {
      await db.delete(customers).where(eq(customers.id, created.id));
      return { ok: false, error: "Avtalet kunde inte sparas." };
    }
  }

  revalidatePath(`/foretag/${company.id}/kunder`);
  return { ok: true };
}
