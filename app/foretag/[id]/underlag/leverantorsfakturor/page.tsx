import type { Metadata } from "next";
import { listCompanyDocuments } from "@/lib/company-documents";
import { DocumentList } from "../document-list";

export const metadata: Metadata = {
  title: "Leverantörsfakturor",
};

export default async function UnderlagLeverantorsfakturorPage({
  params,
}: PageProps<"/foretag/[id]/underlag/leverantorsfakturor">) {
  const { id } = await params;
  const rows = await listCompanyDocuments(id, "leverantorsfaktura");
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-neutral-900">
        Leverantörsfakturor
      </h1>
      <DocumentList
        companyId={id}
        rows={rows}
        empty="Inga leverantörsfakturor ännu"
      />
    </main>
  );
}
