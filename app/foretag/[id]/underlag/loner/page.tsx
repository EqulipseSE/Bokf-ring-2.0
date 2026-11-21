import type { Metadata } from "next";
import { listCompanyDocuments } from "@/lib/company-documents";
import { DocumentList } from "../document-list";

export const metadata: Metadata = {
  title: "Löner",
};

export default async function UnderlagLonerPage({
  params,
}: PageProps<"/foretag/[id]/underlag/loner">) {
  const { id } = await params;
  const rows = await listCompanyDocuments(id, "lon");
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-neutral-900">
        Löner
      </h1>
      <DocumentList companyId={id} rows={rows} empty="Inga löner ännu" />
    </main>
  );
}
