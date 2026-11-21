import type { Metadata } from "next";
import { listDeletedDocuments } from "@/lib/company-documents";
import { DocumentList } from "../document-list";

export const metadata: Metadata = {
  title: "Senast raderade",
};

export default async function RaderadeUnderlagPage({
  params,
}: PageProps<"/foretag/[id]/underlag/raderade">) {
  const { id } = await params;
  const rows = await listDeletedDocuments(id);
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Senast raderade
      </h1>
      <p className="mt-1 mb-8 text-sm text-neutral-500">
        Underlagen ligger kvar i 48 timmar och tas sedan bort permanent.
      </p>
      <DocumentList companyId={id} rows={rows} empty="Inga raderade underlag" archived />
    </main>
  );
}
