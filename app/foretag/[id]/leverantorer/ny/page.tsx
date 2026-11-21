import type { Metadata } from "next";
import { SupplierForm } from "./supplier-form";

export const metadata: Metadata = { title: "Ny leverantör" };

export default async function NyLeverantorPage({
  params,
}: PageProps<"/foretag/[id]/leverantorer/ny">) {
  const { id } = await params;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <SupplierForm companyId={id} />
    </main>
  );
}
