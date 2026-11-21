"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveSupplierInvoices, bookSupplierInvoices } from "./bulk-actions";
import { setSupplierInvoiceSelection, useSupplierInvoiceSelection } from "./selection";

export function SupplierInvoiceMenuActions({ companyId }: { companyId: string }) {
  const router = useRouter();
  const selected = useSupplierInvoiceSelection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canApprove = selected.some((item) => !item.bookedInL && item.status !== "godkand");
  const canBook = selected.some((item) => !item.bookedInL);

  async function run(action: "approve" | "book") {
    setBusy(true);
    setError("");
    const ids =
      action === "approve"
        ? selected.filter((item) => !item.bookedInL && item.status !== "godkand").map((item) => item.id)
        : selected.filter((item) => !item.bookedInL).map((item) => item.id);
    const result =
      action === "approve"
        ? await approveSupplierInvoices(companyId, ids)
        : await bookSupplierInvoices(companyId, ids);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSupplierInvoiceSelection([]);
    router.refresh();
  }

  const approveDisabled = busy || !canApprove;
  const bookDisabled = busy || !canBook;

  return (
    <div className="ml-8 flex flex-col gap-1 self-center">
      <button
        type="button"
        disabled={approveDisabled}
        onClick={() => run("approve")}
        className="rounded-md bg-white px-3 py-1 text-left text-xs font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-300 hover:bg-neutral-50 disabled:cursor-default disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none disabled:ring-neutral-200 disabled:hover:bg-neutral-200"
      >
        Godkänn markerade
      </button>
      <button
        type="button"
        disabled={bookDisabled}
        onClick={() => run("book")}
        className="rounded-md bg-white px-3 py-1 text-center text-xs font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-300 hover:bg-neutral-50 disabled:cursor-default disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none disabled:ring-neutral-200 disabled:hover:bg-neutral-200"
      >
        Bokför markerade
      </button>
      {error ? <p className="max-w-48 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
