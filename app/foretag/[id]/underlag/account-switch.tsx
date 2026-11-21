"use client";

import { useRouter } from "next/navigation";

type BankAccountOption = {
  uid: string;
  accountNumber: string;
  bookAccountNumber: string | null;
  bookAccountName: string | null;
};

export function AccountSwitch({
  accounts,
  selectedUid,
}: {
  accounts: BankAccountOption[];
  selectedUid: string;
}) {
  const router = useRouter();
  const selected = accounts.find((account) => account.uid === selectedUid) ?? accounts[0];
  if (!selected) return null;

  if (accounts.length < 2) {
    return (
      <div className="inline-flex flex-col rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">Konto</span>
        <span className="text-sm font-medium tabular-nums text-neutral-900">{selected.accountNumber}</span>
        <BookAccount account={selected} />
      </div>
    );
  }

  return (
    <label className="inline-flex flex-col rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <span className="text-[11px] font-medium tracking-wide text-neutral-500 uppercase">Konto</span>
      <select
        value={selected.uid}
        onChange={(event) => {
          const uid = event.target.value;
          router.push(uid ? `?konto=${encodeURIComponent(uid)}` : "?");
        }}
        className="bg-transparent text-sm font-medium text-neutral-900 outline-none"
      >
        {accounts.map((account) => (
          <option key={account.uid} value={account.uid}>
            {account.accountNumber}
          </option>
        ))}
      </select>
      <BookAccount account={selected} />
    </label>
  );
}

function BookAccount({
  account,
}: {
  account: { bookAccountNumber: string | null; bookAccountName: string | null };
}) {
  if (!account.bookAccountNumber) return null;
  return (
    <span className="text-xs tabular-nums text-neutral-500">
      {account.bookAccountNumber}
      {account.bookAccountName ? ` ${account.bookAccountName}` : ""}
    </span>
  );
}
