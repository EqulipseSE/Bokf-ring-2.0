import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = {
  title: "Nytt företag — Omnio",
};

export default async function NyttForetagPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <AppHeader userName={user.name} />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
        <Link
          href="/klientforetag"
          className="text-sm text-neutral-500 transition hover:text-neutral-900"
        >
          ← Tillbaka till klientföretag
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          Nytt företag
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Lägg till ett klientföretag i byråns lista.
        </p>

        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <CompanyForm />
        </div>
      </main>
    </div>
  );
}
