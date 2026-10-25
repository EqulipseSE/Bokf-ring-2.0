import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAccountBalances, getVoucher } from "@/lib/vouchers";
import { SavedVoucher } from "../saved-voucher";

export async function generateMetadata({
  params,
}: PageProps<"/foretag/[id]/verifikationer/[voucherId]">): Promise<Metadata> {
  const { id, voucherId } = await params;
  const voucher = await getVoucher(id, voucherId);
  return { title: voucher ? voucher.numberLabel : "Verifikation" };
}

export default async function VerifikationPage({
  params,
}: PageProps<"/foretag/[id]/verifikationer/[voucherId]">) {
  const { id, voucherId } = await params;
  const voucher = await getVoucher(id, voucherId);
  if (!voucher) notFound();
  const accountBalances = await getAccountBalances(id);

  return (
    <main className="flex flex-1 flex-col">
      <SavedVoucher
        companyId={id}
        voucher={voucher}
        accountBalances={accountBalances}
      />
    </main>
  );
}
