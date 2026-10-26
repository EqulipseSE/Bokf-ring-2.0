import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLockedThrough } from "@/lib/period-lock-query";
import { todayIsoDate } from "@/lib/voucher-date";
import {
  LAST_VOUCHER_DATE_COOKIE,
  getAccountBalances,
  listCompanyAccounts,
  peekNextVoucherLabel,
} from "@/lib/vouchers";
import { VoucherForm } from "../voucher-form";

export const metadata: Metadata = {
  title: "Ny verifikation",
};

export default async function NyVerifikationPage({
  params,
}: PageProps<"/foretag/[id]/verifikationer/ny">) {
  const { id } = await params;
  const accounts = await listCompanyAccounts(id);
  const nextNumberLabel = await peekNextVoucherLabel(id);
  const accountBalances = await getAccountBalances(id);
  const lockedThrough = await getLockedThrough(id);
  const cookieStore = await cookies();
  const storedDate = cookieStore.get(LAST_VOUCHER_DATE_COOKIE)?.value;
  const defaultDate =
    storedDate && /^\d{4}-\d{2}-\d{2}$/.test(storedDate)
      ? storedDate
      : todayIsoDate();

  return (
    <main className="flex flex-1 flex-col">
      <VoucherForm
        companyId={id}
        accounts={accounts}
        defaultDate={defaultDate}
        nextNumberLabel={nextNumberLabel}
        accountBalances={accountBalances}
        lockedThrough={lockedThrough}
      />
    </main>
  );
}
