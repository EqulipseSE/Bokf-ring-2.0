import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLatestVoucherId } from "@/lib/vouchers";
import { EmptyVoucherCard } from "../empty-voucher-card";

export const metadata: Metadata = {
  title: "Verifikation",
};

export default async function VerifikationKortPage({
  params,
}: PageProps<"/foretag/[id]/verifikationer/kort">) {
  const { id } = await params;
  const latestId = await getLatestVoucherId(id);
  if (latestId) {
    redirect(`/foretag/${id}/verifikationer/${latestId}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <EmptyVoucherCard companyId={id} />
    </main>
  );
}
