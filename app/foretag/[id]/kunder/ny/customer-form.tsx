"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { matchesQuery } from "@/lib/search";
import { createCustomer } from "./customer-actions";

const PAYMENT_TERMS = [
  { days: 0, label: "Kontant" },
  { days: 10, label: "10 dagar" },
  { days: 15, label: "15 dagar" },
  { days: 20, label: "20 dagar" },
  { days: 30, label: "30 dagar" },
  { days: 60, label: "60 dagar" },
] as const;

const CUSTOMER_TYPES = [
  { id: "foretag", label: "Företag" },
  { id: "privatperson", label: "Privatperson" },
] as const;

const INVOICE_DELIVERY = [
  { id: "epost", label: "E-post" },
  { id: "utskrift", label: "Utskrift" },
] as const;

type CustomerType = (typeof CUSTOMER_TYPES)[number]["id"];
type InvoiceDelivery = (typeof INVOICE_DELIVERY)[number]["id"];

const fieldClass =
  "h-7 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400";

const NEXT_FIELD: Record<string, string> = {
  namn: "orgnr",
  orgnr: "adress",
  adress: "postnummer",
  postnummer: "ort",
  ort: "vat",
  vat: "telefon",
  telefon: "epost",
  epost: "anteckning",
  anteckning: "bankgiro",
  bankgiro: "plusgiro",
  plusgiro: "spara",
};

function focusCustomerField(name: string) {
  document.querySelector<HTMLElement>(`[data-customer-field="${name}"]`)?.focus();
}

function enterMovesToNext(name: string) {
  return (event: { key: string; preventDefault: () => void }) => {
    if (event.key !== "Enter") return;
    const next = NEXT_FIELD[name];
    if (!next) return;
    event.preventDefault();
    focusCustomerField(next);
  };
}

function orgNumber(value: string, previous: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const removedHyphen =
    previous.endsWith("-") &&
    !value.endsWith("-") &&
    digits.length === 6;
  if (removedHyphen) return digits.slice(0, 5);
  if (digits.length < 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

export function CustomerForm({
  companyId,
  accounts,
}: {
  companyId: string;
  accounts: { number: string; name: string }[];
}) {
  const router = useRouter();
  const presetAccount = accounts.find((account) => account.number === "1510");
  const [type, setType] = useState<CustomerType>("foretag");
  const [invoiceDelivery, setInvoiceDelivery] = useState<InvoiceDelivery>("epost");
  const [paymentDays, setPaymentDays] = useState("30");
  const [identityNumber, setIdentityNumber] = useState("");
  const [bankgiro, setBankgiro] = useState("");
  const [plusgiro, setPlusgiro] = useState("");
  const [accountNumber, setAccountNumber] = useState(presetAccount?.number ?? "1510");
  const [agreementName, setAgreementName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const agreementInput = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const data = new FormData(event.currentTarget);
    data.set("customerType", type);
    data.set("invoiceDelivery", invoiceDelivery);
    data.set("accountNumber", accountNumber);
    try {
      const result = await createCustomer(companyId, data);
      if (!result.ok) {
        setSaveError(result.error);
        setSaving(false);
        return;
      }
      router.push(`/foretag/${companyId}/kunder`);
    } catch {
      setSaveError("Kunden kunde inte sparas.");
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-8" onSubmit={onSubmit}>
      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Grunduppgifter</h2>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Kundnummer">
            <input
              readOnly
              value="Automatiskt"
              className={`${fieldClass} bg-neutral-50 text-neutral-500`}
            />
          </Field>
          <Field label="Namn">
            <input
              name="name"
              required
              data-customer-field="namn"
              className={fieldClass}
              onKeyDown={enterMovesToNext("namn")}
            />
          </Field>
          <Field label="Org/persnr">
            <input
              name="identityNumber"
              data-customer-field="orgnr"
              onKeyDown={enterMovesToNext("orgnr")}
              inputMode="numeric"
              autoComplete="off"
              placeholder="xxxxxx-xxxx"
              pattern="\d{6}-\d{4}"
              title="Ange numret som xxxxxx-xxxx"
              value={identityNumber}
              onChange={(event) =>
                setIdentityNumber((current) => orgNumber(event.target.value, current))
              }
              className={fieldClass}
            />
          </Field>
          <div className="grid gap-1 text-xs text-neutral-600">
            Typ
            <div className="flex gap-2">
              {CUSTOMER_TYPES.map((option) => {
                const selected = type === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setType(option.id)}
                    className={`h-7 flex-1 border text-sm ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Adress" className="sm:col-span-2">
            <input name="address" data-customer-field="adress" onKeyDown={enterMovesToNext("adress")} className={fieldClass} />
          </Field>
          <Field label="Postnummer">
            <input name="postalCode" data-customer-field="postnummer" onKeyDown={enterMovesToNext("postnummer")} className={fieldClass} />
          </Field>
          <Field label="Ort">
            <input name="city" data-customer-field="ort" onKeyDown={enterMovesToNext("ort")} className={fieldClass} />
          </Field>
          <Field label="VAT-nr">
            <input name="vatNumber" data-customer-field="vat" onKeyDown={enterMovesToNext("vat")} className={fieldClass} />
          </Field>
          <Field label="Telefon">
            <input name="phone" data-customer-field="telefon" onKeyDown={enterMovesToNext("telefon")} className={fieldClass} />
          </Field>
          <Field label="E-post">
            <input name="email" type="email" data-customer-field="epost" onKeyDown={enterMovesToNext("epost")} className={fieldClass} />
          </Field>
          <Field label="Anteckning" className="sm:col-span-2 lg:col-span-3">
            <textarea name="note" rows={3} data-customer-field="anteckning" onKeyDown={enterMovesToNext("anteckning")} className={`${fieldClass} h-auto py-1.5`} />
          </Field>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Fler uppgifter</h2>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Betalningsvillkor">
            <select
              name="paymentDays"
              value={paymentDays}
              onChange={(event) => setPaymentDays(event.target.value)}
              className={fieldClass}
            >
              {PAYMENT_TERMS.map((term) => (
                <option key={term.days} value={term.days}>
                  {term.label}
                </option>
              ))}
            </select>
          </Field>
          <AccountField
            accounts={accounts}
            number={accountNumber}
            onNumber={setAccountNumber}
          />
          <div className="grid gap-1 text-xs text-neutral-600">
            Fakturaval
            <div className="flex gap-2">
              {INVOICE_DELIVERY.map((option) => {
                const selected = invoiceDelivery === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setInvoiceDelivery(option.id)}
                    className={`h-7 flex-1 border text-sm ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Bankgiro">
            <input
              name="bankgiro"
              data-customer-field="bankgiro"
              value={bankgiro}
              onChange={(event) => setBankgiro(event.target.value.replace(/[^\d-]/g, ""))}
              onKeyDown={enterMovesToNext("bankgiro")}
              className={fieldClass}
            />
          </Field>
          <Field label="Plusgiro">
            <input
              name="plusgiro"
              data-customer-field="plusgiro"
              value={plusgiro}
              onChange={(event) => setPlusgiro(event.target.value.replace(/[^\d-]/g, ""))}
              onKeyDown={enterMovesToNext("plusgiro")}
              className={fieldClass}
            />
          </Field>
          <Field label="Rabatt %">
            <input name="discount" className={fieldClass} />
          </Field>
          <div className="grid gap-1 text-xs text-neutral-600">
            Avtal
            <div className="flex min-w-0 items-center gap-2">
              <input
                ref={agreementInput}
                name="agreement"
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="sr-only"
                onChange={(event) =>
                  setAgreementName(event.target.files?.[0]?.name ?? "")
                }
              />
              <button
                type="button"
                onClick={() => agreementInput.current?.click()}
                className="h-7 w-fit shrink-0 border border-neutral-300 bg-white px-3 text-sm text-neutral-900 hover:bg-neutral-50"
              >
                Ladda upp
              </button>
              {agreementName ? (
                <span className="min-w-0 truncate text-sm text-neutral-900">{agreementName}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
          <button
            type="submit"
            data-customer-field="spara"
            disabled={saving}
            className="h-8 w-fit border border-neutral-900 bg-neutral-900 px-4 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Spara
          </button>
        </div>
      </section>
      <div aria-hidden className="min-h-[20vh] rounded-lg border border-neutral-200 bg-white" />
    </form>
  );
}

function AccountField({
  accounts,
  number,
  onNumber,
}: {
  accounts: { number: string; name: string }[];
  number: string;
  onNumber: (number: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const preset = accounts.find((account) => account.number === number);
  const [text, setText] = useState(preset ? `${preset.number} ${preset.name}` : number);
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(() => {
    if (browse || !text.trim()) return accounts;
    return accounts.filter((account) => matchesQuery([account.number, account.name], text));
  }, [accounts, browse, text]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(account: { number: string; name: string }) {
    onNumber(account.number);
    setText(`${account.number} ${account.name}`);
    setOpen(false);
    setBrowse(false);
  }

  return (
    <div ref={rootRef} className="relative grid gap-1 text-xs text-neutral-600">
      Kundfordranskonto
      <div className="flex border border-neutral-300 bg-white focus-within:ring-1 focus-within:ring-neutral-400">
        <input
          role="combobox"
          aria-label="Kundfordranskonto"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={text}
          onMouseDown={(event) => {
            setBrowse(true);
            setHighlight(0);
            setOpen(true);
            const input = event.currentTarget;
            window.setTimeout(() => input.select(), 0);
          }}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onMouseUp={(event) => {
            event.preventDefault();
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setText(event.target.value);
            onNumber("");
            setBrowse(false);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setBrowse(true);
              setOpen(true);
              setHighlight((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((index) => Math.max(index - 1, 0));
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (open && matches[highlight] && (browse || text.trim())) choose(matches[highlight]);
              else setOpen(false);
              return;
            }
            if (event.key === "Escape") setOpen(false);
          }}
          className="h-7 min-w-0 flex-1 bg-transparent px-2 text-sm text-neutral-900 outline-none"
        />
        <button
          type="button"
          aria-label="Visa kontoplanen"
          aria-expanded={open}
          onMouseDown={(event) => {
            event.preventDefault();
            setBrowse(true);
            setHighlight(0);
            setOpen((current) => !current);
          }}
          className="flex h-7 w-6 shrink-0 items-center justify-center text-neutral-500 hover:text-neutral-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="absolute top-full z-20 mt-0.5 w-full border border-neutral-200 bg-white shadow-md">
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto py-1">
            {matches.length === 0 ? (
              <li className="px-2.5 py-1.5 text-sm text-neutral-500">Ingen träff.</li>
            ) : (
              matches.map((account, index) => (
                <li key={account.number} role="option" aria-selected={account.number === number || index === highlight}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(account);
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    className={`flex w-full items-baseline gap-3 px-2.5 py-1.5 text-left text-sm ${
                      index === highlight ? "bg-neutral-100" : ""
                    }`}
                  >
                    <span className="w-12 shrink-0 font-mono tabular-nums text-neutral-500">{account.number}</span>
                    <span className="min-w-0 flex-1 truncate text-neutral-900">{account.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-1 text-xs text-neutral-600 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
