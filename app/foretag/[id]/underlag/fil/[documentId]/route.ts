import { notFound, redirect } from "next/navigation";
import { readCompanyDocument } from "@/lib/company-documents";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/foretag/[id]/underlag/fil/[documentId]">
) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const { id, documentId } = await ctx.params;
  const company = await getCompany(id);
  if (!company) notFound();

  const found = await readCompanyDocument(company.id, documentId);
  if (!found) notFound();

  const body = new Uint8Array(found.stored.byteLength);
  body.set(found.stored);

  return new Response(body, {
    headers: {
      "Content-Type": found.row.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${encodeURIComponent(found.row.originalName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
