import type { Metadata } from "next";
import { listVouchers } from "@/lib/vouchers";
import { VoucherList } from "./voucher-list";

export const metadata: Metadata = {
  title: "Verifikationer",
};

export default async function VerifikationerPage({
  params,
}: PageProps<"/foretag/[id]/verifikationer">) {
  const { id } = await params;
  const items = await listVouchers(id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Verifikationer
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Registrerade verifikationer för det valda företaget.
        </p>
      </div>
      <VoucherList companyId={id} items={items} />
    </main>
  );
}
