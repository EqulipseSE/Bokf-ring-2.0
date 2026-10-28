import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { listTimeReportRows } from "@/lib/time-reports-query";
import { TimeReportTable } from "./time-report-table";

export const metadata: Metadata = {
  title: "Tidsrapporter — Omnio",
};

export default async function TidsrapporterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const { rows, caption } = await listTimeReportRows(user);

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <AppHeader userName={user.name} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Tidsrapporter
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Arbetad tid per person, företag och kalendermånad. {caption}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <p className="font-medium text-neutral-900">Inga tidsrapporter ännu</p>
            <p className="mt-1 text-sm text-neutral-500">
              Inga timmar att visa.
            </p>
          </div>
        ) : (
          <TimeReportTable rows={rows} />
        )}
      </main>
    </div>
  );
}
