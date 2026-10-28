import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertDateOpen } from "@/lib/period-lock";
import { getLockedThrough } from "@/lib/period-lock-query";
import {
  getAccountBalances,
  getVoucher,
  listAccountsForVoucherEdit,
  listVoucherChanges,
} from "@/lib/vouchers";
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
  const [accountBalances, lockedThrough, changes, accounts] = await Promise.all([
    getAccountBalances(id),
    getLockedThrough(id),
    listVoucherChanges(id, voucherId),
    listAccountsForVoucherEdit(
      id,
      voucher.lines.map((line) => line.accountId)
    ),
  ]);
  const periodCheck = assertDateOpen(voucher.date, lockedThrough);

  return (
    <main className="flex flex-1 flex-col">
      <SavedVoucher
        companyId={id}
        voucher={voucher}
        accounts={accounts}
        accountBalances={accountBalances}
        periodLocked={!periodCheck.ok}
        lockMessage={periodCheck.ok ? null : periodCheck.error}
        lockedThrough={lockedThrough}
        changes={changes}
      />
    </main>
  );
}
