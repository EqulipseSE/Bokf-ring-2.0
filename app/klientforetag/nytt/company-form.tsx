"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ORGNR_PATTERN } from "@/lib/organisationsnummer";
import { CompanyPolicyFields } from "@/app/components/company-policy-fields";
import {
  LEGAL_FORMS,
  LEGAL_FORM_LABELS,
  type LegalForm,
} from "@/lib/company-settings";
import { BAS_CHARTS, type BasChartId } from "@/lib/db/bas-accounts";
import { createCompany, type CreateCompanyState } from "./actions";

export function CompanyForm() {
  const [state, formAction, pending] = useActionState<
    CreateCompanyState,
    FormData
  >(createCompany, null);
  const [legalForm, setLegalForm] = useState<LegalForm>("ab");
  const [chart, setChart] = useState<BasChartId>("bas-2026-ab");
  const [name, setName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");

  function onLegalFormChange(value: LegalForm) {
    setLegalForm(value);
    setChart(value === "ab" ? "bas-2026-ab" : "bas-2026-ef");
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Företagsnamn
        </label>
        <div className="flex items-center gap-3">
          <input
            id="name"
            name="name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Exempelbolaget AB"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          />
          <button
            type="button"
            className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-medium text-neutral-700"
          >
            Hämta företag
          </button>
        </div>
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
          value={orgNumber}
          onChange={(event) => setOrgNumber(event.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 tabular-nums text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        />
        <p className="text-xs text-neutral-400">Format: NNNNNN-NNNN</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="legalForm" className="text-sm font-medium text-neutral-700">
          Bolagsform
        </label>
        <select
          id="legalForm"
          name="legalForm"
          value={legalForm}
          required
          onChange={(event) => onLegalFormChange(event.target.value as LegalForm)}
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        >
          {LEGAL_FORMS.map((value) => (
            <option key={value} value={value}>
              {LEGAL_FORM_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <CompanyPolicyFields />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="chart" className="text-sm font-medium text-neutral-700">
          Kontoplan
        </label>
        <select
          id="chart"
          name="chart"
          value={chart}
          required
          onChange={(event) => setChart(event.target.value as BasChartId)}
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        >
          {BAS_CHARTS.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {chart.label}
            </option>
          ))}
        </select>
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
