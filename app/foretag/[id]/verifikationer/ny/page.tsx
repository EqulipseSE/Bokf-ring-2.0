import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LAST_VOUCHER_DATE_COOKIE, listCompanyAccounts } from "@/lib/vouchers";
import { VoucherForm } from "../voucher-form";

export const metadata: Metadata = {
  title: "Ny verifikation",
};

export default async function NyVerifikationPage({
  params,
}: PageProps<"/foretag/[id]/verifikationer/ny">) {
  const { id } = await params;
  const accounts = await listCompanyAccounts(id);
  const cookieStore = await cookies();
  const storedDate = cookieStore.get(LAST_VOUCHER_DATE_COOKIE)?.value;
  const defaultDate =
    storedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedDate)
      ? storedDate
      : isoDateToday();

  return (
    <main className="flex flex-1 flex-col">
      <VoucherForm companyId={id} accounts={accounts} defaultDate={defaultDate} />
    </main>
  );
}

function isoDateToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
