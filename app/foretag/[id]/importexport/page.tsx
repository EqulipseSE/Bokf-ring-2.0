import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Import/export",
};

export default async function ImportExportPage({
  params,
}: PageProps<"/foretag/[id]/importexport">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Import/export
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Här kommer inläsning och utläsning av SIE-filer för {company.name}.
        Ingen import eller export är kopplad ännu.
      </p>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-400"
          >
            Importera SIE
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-400"
          >
            Exportera SIE
          </button>
        </div>
        <p className="mt-4 text-sm text-neutral-500">
          SIE-logik kommer i ett senare steg.
        </p>
      </div>
    </main>
  );
}
