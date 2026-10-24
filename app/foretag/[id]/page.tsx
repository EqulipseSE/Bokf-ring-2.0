import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppHeader } from "@/app/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCompany(id: string) {
  if (!UUID_REGEX.test(id)) return null;
  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/foretag/[id]">): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompany(id);
  return {
    title: company
      ? `${company.name} — Omnio`
      : "Företag — Omnio",
  };
}

export default async function ForetagPage({
  params,
}: PageProps<"/foretag/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <AppHeader userName={user.name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href="/klientforetag"
          className="text-sm text-neutral-500 transition hover:text-neutral-900"
        >
          ← Tillbaka till klientföretag
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
          {company.name}
        </h1>
        <p className="mt-1 text-sm tabular-nums text-neutral-500">
          {company.orgNumber}
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <p className="text-neutral-500">
            Bokföringsvyerna för företaget kommer i nästa steg.
          </p>
        </div>
      </main>
    </div>
  );
}
