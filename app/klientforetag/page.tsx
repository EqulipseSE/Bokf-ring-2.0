import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { refreshStaleBankConnections } from "@/lib/bank-sync";
import { listClientRows } from "@/lib/client-list-query";
import { ClientTable } from "./client-table";

export const metadata: Metadata = {
  title: "Klientföretag — Omnio",
};

export default async function KlientforetagPage({
  searchParams,
}: {
  searchParams: Promise<{ bankfel?: string; bank?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  const query = await searchParams;
  await refreshStaleBankConnections();

  const clients = await listClientRows();

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <AppHeader userName={user.name} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Klientföretag
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Byråns klientföretag. Välj ett företag för att arbeta med det.
            </p>
          </div>
          <Link
            href="/klientforetag/nytt"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Nytt företag
          </Link>
        </div>

        {query.bankfel ? (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {query.bankfel}
          </p>
        ) : null}
        {query.bank === "kopplad" ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
            Banken är kopplad och kontoutdraget är hämtat.
          </p>
        ) : null}

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <p className="font-medium text-neutral-900">Inga företag ännu</p>
            <p className="mt-1 text-sm text-neutral-500">
              Lägg till byråns första klientföretag för att komma igång.
            </p>
            <Link
              href="/klientforetag/nytt"
              className="mt-6 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Nytt företag
            </Link>
          </div>
        ) : (
          <ClientTable clients={clients} />
        )}
      </main>
    </div>
  );
}
