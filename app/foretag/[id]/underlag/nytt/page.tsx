import type { Metadata } from "next";
import { NewDocumentForm } from "../new-document-form";

export const metadata: Metadata = {
  title: "Nytt underlag",
};

export default async function NyttUnderlagPage({
  params,
}: PageProps<"/foretag/[id]/underlag/nytt">) {
  const { id } = await params;
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Nytt underlag
      </h1>
      <p className="mt-1 mb-8 text-sm text-neutral-500">
        Fota, välj filer eller en hel mapp. Underlagen sorteras automatiskt, och du kan byta kategori om det blev fel.
      </p>
      <NewDocumentForm companyId={id} />
    </main>
  );
}
