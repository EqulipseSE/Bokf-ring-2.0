import {
  ACCOUNTING_METHOD_LABELS,
  ACCOUNTING_METHODS,
  VAT_PERIOD_LABELS,
  VAT_PERIODS,
  type AccountingMethod,
  type CompanyVatPeriod,
} from "@/lib/company-settings";

const fieldClass =
  "rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200";

export function CompanyPolicyFields({
  vatPeriod = "manad",
  accountingMethod = "faktura",
}: {
  vatPeriod?: CompanyVatPeriod;
  accountingMethod?: AccountingMethod;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vatPeriod" className="text-sm font-medium text-neutral-700">
          Momsperiod
        </label>
        <select
          id="vatPeriod"
          name="vatPeriod"
          defaultValue={vatPeriod}
          required
          className={fieldClass}
        >
          {VAT_PERIODS.map((value) => (
            <option key={value} value={value}>
              {VAT_PERIOD_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-400">
          Styr periodlåsning: månad, kvartal eller helår.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="accountingMethod"
          className="text-sm font-medium text-neutral-700"
        >
          Redovisningsmetod
        </label>
        <select
          id="accountingMethod"
          name="accountingMethod"
          defaultValue={accountingMethod}
          required
          className={fieldClass}
        >
          {ACCOUNTING_METHODS.map((value) => (
            <option key={value} value={value}>
              {ACCOUNTING_METHOD_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-400">
          Fakturametoden eller kontantmetoden. Sparad för senare AI-bokföring.
        </p>
      </div>
    </div>
  );
}
