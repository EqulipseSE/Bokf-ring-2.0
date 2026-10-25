import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPlaceholderSlug, PLACEHOLDERS } from "../menu";

export async function generateMetadata({
  params,
}: PageProps<"/foretag/[id]/[avsnitt]">): Promise<Metadata> {
  const { avsnitt } = await params;
  return {
    title: isPlaceholderSlug(avsnitt) ? PLACEHOLDERS[avsnitt] : "Sidan saknas",
  };
}

export default async function AvsnittPage({
  params,
}: PageProps<"/foretag/[id]/[avsnitt]">) {
  const { avsnitt } = await params;
  if (!isPlaceholderSlug(avsnitt)) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        {PLACEHOLDERS[avsnitt]}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Innehållet kommer i nästa steg.
      </p>
    </main>
  );
}
