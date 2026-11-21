"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupplier } from "./actions";

const fieldClass =
  "h-8 w-full border border-neutral-300 bg-white px-2 text-sm outline-none focus:ring-1 focus:ring-neutral-400";

export function SupplierForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [paymentDays, setPaymentDays] = useState("30");
  const [costAccount, setCostAccount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await createSupplier(companyId, {
      number,
      name,
      paymentDays: Number(paymentDays),
      costAccount,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/foretag/${companyId}/leverantorer`);
  }

  return (
    <div className="grid max-w-lg gap-2">
      <label className="flex items-center gap-3 text-sm">
        <span className="w-40">Leverantörsnummer</span>
        <input
          aria-label="Leverantörsnummer"
          inputMode="numeric"
          value={number}
          onChange={(event) => setNumber(event.target.value.replace(/\D/g, ""))}
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <span className="w-40">Namn</span>
        <input
          aria-label="Namn"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <span className="w-40">Betalningsvillkor</span>
        <input
          aria-label="Betalningsvillkor"
          inputMode="numeric"
          value={paymentDays}
          onChange={(event) => setPaymentDays(event.target.value.replace(/\D/g, ""))}
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <span className="w-40">Kostnadskonto</span>
        <input
          aria-label="Kostnadskonto"
          inputMode="numeric"
          value={costAccount}
          onChange={(event) => setCostAccount(event.target.value.replace(/\D/g, ""))}
          className={fieldClass}
        />
      </label>
      <p className="text-sm text-neutral-500">0 betyder att fakturan fördelas i den stora rutan.</p>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-2 w-fit rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white"
      >
        {saving ? "Sparar…" : "Spara"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
