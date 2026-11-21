import type { Metadata } from "next";
import { listCustomers } from "@/lib/customers";
import { CustomerList } from "./customer-list";

export const metadata: Metadata = { title: "Kunder" };

export default async function KunderPage({
  params,
  searchParams,
}: PageProps<"/foretag/[id]/kunder">) {
  const { id } = await params;
  const query = await searchParams;
  const showHidden = query.dolda === "1";
  const customers = await listCustomers(id, showHidden);

  return (
    <main className="w-full flex-1">
      <CustomerList companyId={id} customers={customers} showHidden={showHidden} />
    </main>
  );
}
