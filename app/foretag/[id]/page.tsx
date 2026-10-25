import { getCompany } from "@/lib/company";

export default async function ForetagPage({
  params,
}: PageProps<"/foretag/[id]">) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) return null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        {company.name}
      </h1>
      <p className="mt-1 text-sm tabular-nums text-neutral-500">
        {company.orgNumber}
      </p>
      <p className="mt-6 text-sm text-neutral-500">
        Välj ett alternativ i menyn. Innehållet kommer i nästa steg.
      </p>
    </main>
  );
}
