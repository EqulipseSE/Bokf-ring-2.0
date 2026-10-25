import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Företagsinställningar",
};

export default async function ForetagsinstallningarPage({
  params,
}: PageProps<"/foretag/[id]/foretagsinstallningar">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Företagsinställningar
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        En första plats för företagets uppgifter. Fler inställningar kommer
        senare.
      </p>

      <form className="mt-8 space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="foretagsnamn"
            className="text-sm font-medium text-neutral-700"
          >
            Företagsnamn
          </label>
          <input
            id="foretagsnamn"
            name="name"
            defaultValue={company.name}
            readOnly
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-neutral-700"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="orgnummer"
            className="text-sm font-medium text-neutral-700"
          >
            Organisationsnummer
          </label>
          <input
            id="orgnummer"
            name="orgNumber"
            defaultValue={company.orgNumber}
            readOnly
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 tabular-nums text-neutral-700"
          />
        </div>
        <p className="text-sm text-neutral-500">
          Ändringar kan inte sparas ännu.
        </p>
      </form>
    </main>
  );
}
