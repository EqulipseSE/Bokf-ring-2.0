import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { AppHeader } from "@/app/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Klientföretag — Omnio",
};

export default async function KlientforetagPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const clients = await db
    .select()
    .from(companies)
    .orderBy(asc(companies.name));

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <AppHeader userName={user.name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
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
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-6 py-3.5 font-medium">Företag</th>
                  <th className="px-6 py-3.5 font-medium">Org.nr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {clients.map((company) => (
                  <tr
                    key={company.id}
                    className="group transition hover:bg-neutral-50"
                  >
                    <td className="p-0">
                      <Link
                        href={`/foretag/${company.id}`}
                        className="block px-6 py-4 font-medium text-neutral-900"
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/foretag/${company.id}`}
                        tabIndex={-1}
                        className="block px-6 py-4 tabular-nums text-neutral-500"
                      >
                        {company.orgNumber}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
