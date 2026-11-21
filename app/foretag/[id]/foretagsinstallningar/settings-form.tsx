"use client";

import { useActionState } from "react";
import { CompanyPolicyFields } from "@/app/components/company-policy-fields";
import type { AccountingMethod, CompanyVatPeriod } from "@/lib/company-settings";
import { ORGNR_PATTERN } from "@/lib/organisationsnummer";
import { updateCompany, type UpdateCompanyState } from "./actions";

const fieldClass =
  "rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200";

export function CompanySettingsForm({
  companyId,
  name,
  orgNumber,
  bankgiro,
  plusgiro,
  vatPeriod,
  accountingMethod,
}: {
  companyId: string;
  name: string;
  orgNumber: string;
  bankgiro: string;
  plusgiro: string;
  vatPeriod: CompanyVatPeriod;
  accountingMethod: AccountingMethod;
}) {
  const bound = updateCompany.bind(null, companyId);
  const [state, formAction, pending] = useActionState<
    UpdateCompanyState,
    FormData
  >(bound, null);

  return (
    <form action={formAction} className="mt-8 space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Företagsnamn
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="orgNumber" className="text-sm font-medium text-neutral-700">
          Organisationsnummer
        </label>
        <input
          id="orgNumber"
          name="orgNumber"
          defaultValue={orgNumber}
          required
          inputMode="numeric"
          pattern={ORGNR_PATTERN}
          title="Formatet är NNNNNN-NNNN, t.ex. 556036-0793"
          className={`${fieldClass} tabular-nums`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bankgiro" className="text-sm font-medium text-neutral-700">
          Bankgiro
        </label>
        <input
          id="bankgiro"
          name="bankgiro"
          defaultValue={bankgiro}
          inputMode="numeric"
          className={`${fieldClass} tabular-nums`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plusgiro" className="text-sm font-medium text-neutral-700">
          Plusgiro
        </label>
        <input
          id="plusgiro"
          name="plusgiro"
          defaultValue={plusgiro}
          inputMode="numeric"
          className={`${fieldClass} tabular-nums`}
        />
      </div>

      <CompanyPolicyFields
        vatPeriod={vatPeriod}
        accountingMethod={accountingMethod}
      />

      {state && "error" in state && state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p role="status" className="text-sm font-medium text-emerald-800">
          Inställningarna är sparade.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "Sparar…" : "Spara"}
      </button>
    </form>
  );
}
