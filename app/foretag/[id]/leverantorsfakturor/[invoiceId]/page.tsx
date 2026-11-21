import { redirect } from "next/navigation";

export default async function OldInvoiceRoute({
  params,
}: PageProps<"/foretag/[id]/leverantorsfakturor/[invoiceId]">) {
  const { id, invoiceId } = await params;
  redirect(`/foretag/${id}/leverantorsfakturor/kort/${invoiceId}`);
}
