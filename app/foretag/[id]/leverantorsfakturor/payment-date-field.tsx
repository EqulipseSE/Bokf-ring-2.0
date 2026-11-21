"use client";

import { DateTextInput } from "@/app/components/date-text-input";
import { useState } from "react";
import { setSupplierInvoicePaymentDate } from "./actions";

export function PaymentDateField({
  companyId,
  invoiceId,
  value,
}: {
  companyId: string;
  invoiceId: string;
  value: string | null;
}) {
  const [date, setDate] = useState(value ?? "");
  const [error, setError] = useState("");

  return (
    <DateTextInput
      aria-label="Betaldatum"
      value={date}
      title={error || "Betaldatum från banken. Kan ändras även efter godkännande."}
      onChange={async (event) => {
        const next = event.target.value;
        setDate(next);
        const result = await setSupplierInvoicePaymentDate(companyId, invoiceId, next);
        setError(result.ok ? "" : result.error);
        if (!result.ok && value) setDate(value);
      }}
      className="h-7 border-0 bg-transparent px-0 text-sm text-neutral-900 outline-none"
    />
  );
}
