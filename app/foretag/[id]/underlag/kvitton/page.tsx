import type { Metadata } from "next";
import { listCompanyDocuments } from "@/lib/company-documents";
import { DocumentList } from "../document-list";

export const metadata: Metadata = {
  title: "Kvitton",
};

export default async function UnderlagKvittonPage({
  params,
}: PageProps<"/foretag/[id]/underlag/kvitton">) {
  const { id } = await params;
  const rows = await listCompanyDocuments(id, "kvitto");
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-neutral-900">
        Kvitton
      </h1>
      <DocumentList companyId={id} rows={rows} empty="Inga kvitton ännu" />
    </main>
  );
}
