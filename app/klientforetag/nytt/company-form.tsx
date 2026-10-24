"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ORGNR_PATTERN } from "@/lib/organisationsnummer";
import { createCompany, type CreateCompanyState } from "./actions";

export function CompanyForm() {
  const [state, formAction, pending] = useActionState<
    CreateCompanyState,
    FormData
  >(createCompany, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Företagsnamn
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          placeholder="Exempelbolaget AB"
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="orgNumber"
          className="text-sm font-medium text-neutral-700"
        >
          Organisationsnummer
        </label>
        <input
          id="orgNumber"
          name="orgNumber"
          type="text"
          required
          inputMode="numeric"
          pattern={ORGNR_PATTERN}
          title="Formatet är NNNNNN-NNNN, t.ex. 556036-0793"
          placeholder="556036-0793"
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 tabular-nums text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        />
        <p className="text-xs text-neutral-400">Format: NNNNNN-NNNN</p>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="mt-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending ? "Sparar…" : "Spara företag"}
        </button>
        <Link
          href="/klientforetag"
          className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
