import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import { readCompanyDocument } from "@/lib/company-documents";
import { db } from "@/lib/db";
import { companyDocuments } from "@/lib/db/schema";
import { getVoucherAttachmentRow, readStoredUnderlag } from "@/lib/voucher-files";
import { getVoucher } from "@/lib/vouchers";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/foretag/[id]/verifikationer/[voucherId]/underlag">
) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const { id, voucherId } = await ctx.params;
  const company = await getCompany(id);
  if (!company) notFound();

  const voucher = await getVoucher(company.id, voucherId);
  if (!voucher) notFound();

  const row = await getVoucherAttachmentRow(voucher.id);
  if (row) {
    let stored: Buffer;
    try {
      stored = await readStoredUnderlag(row.storagePath);
    } catch {
      notFound();
    }
    return underlagResponse(stored, row.mimeType, row.originalName);
  }

  const [linked] = await db
    .select({ id: companyDocuments.id })
    .from(companyDocuments)
    .where(
      and(
        eq(companyDocuments.companyId, company.id),
        eq(companyDocuments.voucherId, voucher.id),
        isNull(companyDocuments.deletedAt)
      )
    )
    .limit(1);
  if (!linked) notFound();
  const file = await readCompanyDocument(company.id, linked.id);
  if (!file) notFound();
  return underlagResponse(file.stored, file.row.mimeType, file.row.originalName);
}

function underlagResponse(stored: Uint8Array, mimeType: string, originalName: string) {
  const body = new Uint8Array(stored.byteLength);
  body.set(stored);

  return new Response(body, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${encodeURIComponent(originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
