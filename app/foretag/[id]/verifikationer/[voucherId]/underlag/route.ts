import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
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
  if (!row) notFound();

  let stored: Buffer;
  try {
    stored = await readStoredUnderlag(row.storagePath);
  } catch {
    notFound();
  }

  const body = new Uint8Array(stored.byteLength);
  body.set(stored);

  return new Response(body, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
