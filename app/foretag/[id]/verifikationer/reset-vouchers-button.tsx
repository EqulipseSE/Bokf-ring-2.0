"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetCompanyVouchers } from "./actions";

export function ResetVouchersButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    const confirmed = window.confirm(
      "Tar bort alla verifikationer, börjar om på verifikationsnummer 1 och kopplar loss underlagen. Kontona nollställs. Kontoutdragets rader ligger kvar."
    );
    if (!confirmed) return;
    setPending(true);
    const result = await resetCompanyVouchers(companyId);
    if (!result.ok) {
      setPending(false);
      window.alert(result.error);
      return;
    }
    router.refresh();
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="fixed right-4 bottom-4 z-30 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
    >
      {pending ? "Nollställer…" : "Nollställ verifikationer"}
    </button>
  );
}
