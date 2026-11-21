"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DateTextInput } from "@/app/components/date-text-input";
import { formatOre, invoiceAmounts, lineOre } from "@/lib/invoice-amounts";
import { completeAmountDecimals } from "@/lib/money";
import { parseVoucherDate } from "@/lib/voucher-date";
import { matchesQuery } from "@/lib/search";
import { createInvoice, setInvoicePaymentDate, updateInvoice } from "./invoice-actions";
import { ArticleField, type ArticleOption } from "./article-field";
import type { ArticleAccountOption } from "./article-dialog";

const INVOICE_TYPES = [
  { id: "faktura", label: "Faktura" },
  { id: "kvitto", label: "Kvitto" },
  { id: "kreditfaktura", label: "Kreditfaktura" },
  { id: "avrakning", label: "Avräkning" },
] as const;

type InvoiceType = (typeof INVOICE_TYPES)[number]["id"];

const PAYMENT_TERMS = [
  { days: 0, label: "Kontant" },
  { days: 10, label: "10 dagar" },
  { days: 15, label: "15 dagar" },
  { days: 20, label: "20 dagar" },
  { days: 30, label: "30 dagar" },
  { days: 60, label: "60 dagar" },
] as const;

const fieldClass =
  "h-7 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400";

const cellClass =
  "h-7 w-full bg-transparent px-2 text-sm text-neutral-900 outline-none";

const LINE_COUNT = 8;

function focusInvoiceField(label: string) {
  document.querySelector<HTMLElement>(`[aria-label="${label}"]`)?.focus();
}

function lineIsEmpty(line: InvoiceLine): boolean {
  return (
    !line.number.trim() &&
    !line.name.trim() &&
    !line.unitPrice.trim() &&
    !line.quantity.trim()
  );
}

function lineSum(unitPrice: string, quantity: string): string {
  const ore = lineOre(unitPrice, quantity);
  if (ore === null) return "";
  return formatOre(ore);
}

type InvoiceLine = {
  articleId: string;
  number: string;
  name: string;
  unitPrice: string;
  quantity: string;
  vatCode: string;
  accountNumber: string;
};

function InvoiceLines({
  articles,
  accounts,
  accountNumbers,
  companyId,
  lines,
  onLines,
}: {
  articles: ArticleOption[];
  accounts: ArticleAccountOption[];
  accountNumbers: string[];
  companyId: string;
  lines: InvoiceLine[];
  onLines: (lines: InvoiceLine[]) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  function updateLine(index: number, patch: Partial<InvoiceLine>) {
    onLines(
      lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    );
  }

  return (
    <div className="-mx-4 mt-3 overflow-visible border-t border-neutral-200">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
            <th className="w-32 whitespace-nowrap px-2 py-1.5 font-medium">Artikelnummer</th>
            <th className="px-2 py-1.5 font-medium">Benämning</th>
            <th className="w-28 px-2 py-1.5 text-right font-medium">Enhetspris</th>
            <th className="w-20 px-2 py-1.5 text-right font-medium">Antal</th>
            <th className="w-24 px-2 py-1.5 text-right font-medium">Rabatt</th>
            <th className="w-28 px-2 py-1.5 font-medium">Rabattenhet</th>
            <th className="w-28 px-4 py-1.5 text-right font-medium">Summa</th>
            <th className="w-20 px-2 py-1.5 font-medium">Momskod</th>
            <th className="w-24 px-2 py-1.5 font-medium">Konto</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const active = selected === index;
            return (
              <tr
                key={index}
                onFocusCapture={() => setSelected(index)}
                onClick={() => setSelected(index)}
                className={`border-b border-neutral-200 ${
                  active
                    ? "bg-neutral-100 shadow-[inset_3px_0_0_#171717]"
                    : "hover:bg-neutral-50"
                }`}
              >
                <td className="p-0">
                  <ArticleField
                    label={`Artikelnummer rad ${index + 1}`}
                    value={line.number}
                    articles={articles}
                    accounts={accounts}
                    accountNumbers={accountNumbers}
                    companyId={companyId}
                    showListButton
                    onChange={(number) =>
                      updateLine(index, { number, articleId: "", vatCode: "", accountNumber: "" })
                    }
                    onPick={(article) => {
                      updateLine(index, {
                        articleId: article.id,
                        number: article.number,
                        name: article.name,
                        unitPrice: article.unitPrice ?? "",
                        vatCode: article.vatCode ?? "",
                        accountNumber: article.accountNumber ?? "",
                      });
                      window.setTimeout(
                        () => focusInvoiceField(`Enhetspris rad ${index + 1}`),
                        0
                      );
                    }}
                    onEnter={() =>
                      focusInvoiceField(
                        lineIsEmpty(line) ? "Frakt" : `Benämning rad ${index + 1}`
                      )
                    }
                  />
                </td>
                <td className="p-0">
                  <ArticleField
                    label={`Benämning rad ${index + 1}`}
                    value={line.name}
                    articles={articles}
                    companyId={companyId}
                    onChange={(name) => updateLine(index, { name })}
                    onPick={(article) => {
                      updateLine(index, {
                        articleId: article.id,
                        number: article.number,
                        name: article.name,
                        unitPrice: article.unitPrice ?? "",
                        vatCode: article.vatCode ?? "",
                        accountNumber: article.accountNumber ?? "",
                      });
                      window.setTimeout(
                        () => focusInvoiceField(`Enhetspris rad ${index + 1}`),
                        0
                      );
                    }}
                    onEnter={() =>
                      focusInvoiceField(
                        lineIsEmpty(line) ? "Frakt" : `Enhetspris rad ${index + 1}`
                      )
                    }
                  />
                </td>
                {(
                  [
                    ["Enhetspris", "text-right tabular-nums", `Antal rad ${index + 1}`],
                    ["Antal", "text-right tabular-nums", `Rabatt rad ${index + 1}`],
                    ["Rabatt", "text-right tabular-nums", `Rabattenhet rad ${index + 1}`],
                    [
                      "Rabattenhet",
                      "",
                      index + 1 < LINE_COUNT ? `Artikelnummer rad ${index + 2}` : "",
                    ],
                    ["Summa", "text-right tabular-nums", ""],
                  ] as const
                ).map(([label, align, next]) => (
                  <td key={label} className="p-0">
                    <input
                      aria-label={`${label} rad ${index + 1}`}
                      value={
                        label === "Enhetspris"
                          ? line.unitPrice
                          : label === "Antal"
                            ? line.quantity
                            : label === "Summa"
                              ? lineSum(line.unitPrice, line.quantity)
                              : undefined
                      }
                      readOnly={label === "Summa"}
                      onChange={
                        label === "Enhetspris"
                          ? (event) => updateLine(index, { unitPrice: event.target.value })
                          : label === "Antal"
                            ? (event) => updateLine(index, { quantity: event.target.value })
                            : undefined
                      }
                      onBlur={
                        label === "Enhetspris"
                          ? (event) =>
                              updateLine(index, {
                                unitPrice: completeAmountDecimals(event.target.value),
                              })
                          : undefined
                      }
                      className={`${cellClass} ${align}`}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        const target = lineIsEmpty(line) ? "Frakt" : next;
                        if (!target) return;
                        event.preventDefault();
                        focusInvoiceField(target);
                      }}
                    />
                  </td>
                ))}
                <td className="px-2 text-neutral-700">{line.vatCode}</td>
                <td className="px-2 tabular-nums text-neutral-700">{line.accountNumber}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceTotals({
  lines,
  saving,
  saveError,
  onSave,
  initial,
  locked = false,
  paymentDate,
  onPaymentDate,
}: {
  lines: InvoiceLine[];
  saving: boolean;
  saveError: string | null;
  onSave: (part: {
    includingVat: boolean;
    freight: string;
    invoiceFee: string;
    currency: string;
  }) => void;
  initial?: {
    pricesIncludeVat: boolean;
    freight: string;
    invoiceFee: string;
    currency: string;
  };
  locked?: boolean;
  paymentDate?: string;
  onPaymentDate?: (value: string) => void;
}) {
  const [includingVat, setIncludingVat] = useState(initial?.pricesIncludeVat ?? false);
  const [freight, setFreight] = useState(initial?.freight || "0");
  const [invoiceFee, setInvoiceFee] = useState(initial?.invoiceFee || "0");
  const [currency, setCurrency] = useState(initial?.currency || "SEK");
  const amounts = invoiceAmounts(lines, includingVat, freight, invoiceFee);

  return (
    <div className="-mx-4 grid grid-cols-1 gap-x-8 gap-y-1 border-t border-neutral-200 px-4 py-3 lg:grid-cols-3">
      <div className="space-y-1">
        <div className="flex h-7 items-center">
          <Field label="Inklusive moms">
            <input
              type="checkbox"
              checked={includingVat}
              disabled={locked}
              onChange={(event) => setIncludingVat(event.target.checked)}
              className="h-4 w-4 accent-neutral-900"
            />
          </Field>
        </div>
        {(
          [
            ["Ink. moms", "Inklusive moms, belopp", amounts.gross],
            ["Exkl. moms", "Exklusive moms", amounts.net],
            ["Moms", "Moms", amounts.vat],
            ["Totalt", "Totalt", amounts.total],
          ] as const
        ).map(([label, aria, value]) => (
          <Field key={label} label={label}>
            <input
              readOnly
              aria-label={aria}
              value={value}
              className={`${fieldClass} bg-neutral-50 text-right tabular-nums`}
            />
          </Field>
        ))}
      </div>
      <div className="space-y-1">
        {onPaymentDate ? (
          <Field label="Betaldatum">
            <DateTextInput
              aria-label="Betaldatum"
              value={paymentDate ?? ""}
              onChange={(event) => onPaymentDate(event.target.value)}
              onBlur={() => {
                const trimmed = (paymentDate ?? "").trim();
                if (!trimmed) {
                  onPaymentDate("");
                  return;
                }
                const parsed = parseVoucherDate(trimmed, trimmed);
                if (parsed.ok) onPaymentDate(parsed.iso);
              }}
              className={`${fieldClass} tabular-nums`}
            />
          </Field>
        ) : (
          <div className="h-7" aria-hidden />
        )}
        <Field label="Frakt">
          <input
            aria-label="Frakt"
            inputMode="decimal"
            value={freight}
            readOnly={locked}
            onMouseDown={() => {
              if (freight === "0" || freight === "0,00") setFreight("");
            }}
            onFocus={() => {
              if (freight === "0" || freight === "0,00") setFreight("");
            }}
            onBlur={(event) => {
              const value = event.target.value.trim();
              setFreight(value ? completeAmountDecimals(value) : "0,00");
            }}
            onChange={(event) => setFreight(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              focusInvoiceField("Fakturaavgift");
            }}
            className={`${fieldClass} text-right tabular-nums`}
          />
        </Field>
        <Field label="Fakturaavgift">
          <input
            aria-label="Fakturaavgift"
            inputMode="decimal"
            value={invoiceFee}
            readOnly={locked}
            onMouseDown={() => {
              if (invoiceFee === "0" || invoiceFee === "0,00") setInvoiceFee("");
            }}
            onFocus={() => {
              if (invoiceFee === "0" || invoiceFee === "0,00") setInvoiceFee("");
            }}
            onBlur={(event) => {
              const value = event.target.value.trim();
              setInvoiceFee(value ? completeAmountDecimals(value) : "0,00");
            }}
            onChange={(event) => setInvoiceFee(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
            }}
            className={`${fieldClass} text-right tabular-nums`}
          />
        </Field>
        <Field label="Öresavrundning">
          <input
            readOnly
            aria-label="Öresavrundning"
            value={amounts.rounding}
            className={`${fieldClass} bg-neutral-50 text-right tabular-nums`}
          />
        </Field>
        <Field label="Valuta">
          <select
            aria-label="Valuta"
            value={currency}
            disabled={locked}
            onChange={(event) => setCurrency(event.target.value)}
            className={fieldClass}
          >
            {["SEK", "EUR", "USD", "NOK", "DKK", "GBP"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid h-[7.75rem] grid-cols-2 grid-rows-2 gap-2 self-start lg:mt-8">
        <button
          type="button"
          className="flex min-h-0 flex-col items-center justify-center gap-1 border border-neutral-300 bg-white px-2 text-xs text-neutral-800 hover:bg-neutral-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M6 9V3h12v6" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="7" />
          </svg>
          Skriv ut
        </button>
        <button
          type="button"
          className="flex min-h-0 flex-col items-center justify-center gap-1 border border-neutral-300 bg-white px-2 text-xs text-neutral-800 hover:bg-neutral-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="1.5" />
            <path d="m3 7 9 7 9-7" />
          </svg>
          Skicka
        </button>
        <button
          type="button"
          className="flex min-h-0 flex-col items-center justify-center gap-1 border border-neutral-300 bg-white px-2 text-center text-xs leading-tight text-neutral-800 hover:bg-neutral-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          Förhandsgranska
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ includingVat, freight, invoiceFee, currency })}
          className="flex min-h-0 flex-col items-center justify-center gap-1 border border-neutral-300 bg-white px-2 text-xs text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M5 3h11l3 3v15H5V3Z" />
            <path d="M16 3v4h4" />
            <path d="M8 13h8M8 17h5" />
          </svg>
          Spara
        </button>
      </div>
      {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
    </div>
  );
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function CustomerLookup({
  customers,
  label,
  value,
  digitsOnly = false,
  onChange,
  onPick,
}: {
  customers: { id: string; number: string; name: string }[];
  label: string;
  value: string;
  digitsOnly?: boolean;
  onChange: (value: string) => void;
  onPick: (customer: { id: string; number: string; name: string }) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const matches = useMemo(
    () =>
      customers.filter((customer) =>
        matchesQuery(digitsOnly ? [customer.number] : [customer.number, customer.name], value)
      ),
    [customers, digitsOnly, value]
  );

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(customer: { id: string; number: string; name: string }) {
    onPick(customer);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        inputMode={digitsOnly ? "numeric" : undefined}
        value={value}
        onChange={(event) => {
          const next = digitsOnly ? event.target.value.replace(/\D/g, "") : event.target.value;
          onChange(next);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter" && open && matches[highlight] && value.trim()) {
            event.preventDefault();
            choose(matches[highlight]);
            return;
          }
          if (event.key === "Escape") setOpen(false);
        }}
        className={fieldClass}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-0.5 max-h-48 w-full overflow-auto border border-neutral-200 bg-white py-1 shadow-md"
        >
          {matches.length === 0 ? (
            <li className="px-2.5 py-1.5 text-sm text-neutral-500">Ingen träff.</li>
          ) : (
            matches.map((customer, index) => (
              <li key={customer.id} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(customer);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`flex w-full items-baseline gap-3 px-2.5 py-1.5 text-left text-sm ${
                    index === highlight ? "bg-neutral-100" : ""
                  }`}
                >
                  <span className="w-12 shrink-0 tabular-nums text-neutral-500">{customer.number}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-900">{customer.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-neutral-700">
      <span className="w-36 shrink-0">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

export function InvoiceHeader({
  articles = [],
  accounts = [],
  accountNumbers = [],
  customers = [],
  companyId,
  initial,
}: {
  articles?: ArticleOption[];
  accounts?: ArticleAccountOption[];
  accountNumbers?: string[];
  customers?: { id: string; number: string; name: string }[];
  companyId: string;
  initial?: {
    invoiceId: string;
    number: string;
    invoiceType: InvoiceType;
    customerId: string;
    customerNumber: string;
    customerName: string;
    reference: string;
    invoiceDate: string;
    paymentDays: number;
    dueDate: string;
    purchaseDate: string;
    ownComment: string;
    invoiceComment: string;
    pricesIncludeVat: boolean;
    freight: string;
    invoiceFee: string;
    currency: string;
    lines: InvoiceLine[];
    paymentDate: string;
  };
}) {
  const [type, setType] = useState<InvoiceType>(initial?.invoiceType ?? "faktura");
  const [name, setName] = useState(initial?.customerName ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [customerNumber, setCustomerNumber] = useState(initial?.customerNumber ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate ?? "");
  const [paymentDays, setPaymentDays] = useState(initial?.paymentDays ?? 30);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? "");
  const [ownComment, setOwnComment] = useState(initial?.ownComment ?? "");
  const [invoiceComment, setInvoiceComment] = useState(initial?.invoiceComment ?? "");
  const [paymentDate, setPaymentDate] = useState(initial?.paymentDate ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const [lines, setLines] = useState<InvoiceLine[]>(() => {
    const seeded = initial?.lines ?? [];
    return Array.from({ length: LINE_COUNT }, (_, index) => seeded[index] ?? {
      articleId: "",
      number: "",
      name: "",
      unitPrice: "",
      quantity: "",
      vatCode: "",
      accountNumber: "",
    });
  });

  useEffect(() => {
    if (initial) return;
    const today = todayIso();
    setInvoiceDate(today);
    setDueDate(addDays(today, 30));
    setPurchaseDate(today);
  }, [initial]);

  function changeInvoiceDate(value: string) {
    setInvoiceDate(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) setDueDate(addDays(value, paymentDays));
  }

  function commitTypedDate(raw: string, apply: (iso: string) => void) {
    const trimmed = raw.trim();
    if (!trimmed) {
      apply("");
      return;
    }
    const parsed = parseVoucherDate(trimmed, invoiceDate || todayIso());
    if (parsed.ok) apply(parsed.iso);
  }

  function changePaymentDays(days: number) {
    setPaymentDays(days);
    if (invoiceDate) setDueDate(addDays(invoiceDate, days));
  }

  async function save(part: {
    includingVat: boolean;
    freight: string;
    invoiceFee: string;
    currency: string;
  }) {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    if (initial) {
      try {
        const result = await setInvoicePaymentDate(companyId, initial.invoiceId, paymentDate);
        setSaving(false);
        if (!result.ok) setSaveError(result.error);
        else router.refresh();
      } catch {
        setSaveError("Betaldatumet kunde inte sparas.");
        setSaving(false);
      }
      return;
    }
    const amounts = invoiceAmounts(lines, part.includingVat, part.freight, part.invoiceFee);
    try {
      const result = await (initial
        ? updateInvoice(companyId, initial.invoiceId, {
            invoiceType: type,
            customerId,
            customerNumber,
            customerName: name,
            reference,
            invoiceDate,
            paymentDays,
            dueDate,
            purchaseDate,
            ownComment,
            invoiceComment,
            pricesIncludeVat: part.includingVat,
            freight: part.freight,
            invoiceFee: part.invoiceFee,
            currency: part.currency,
            netOre: amounts.netOre,
            vatOre: amounts.vatOre,
            grossOre: amounts.grossOre,
            roundingOre: amounts.roundingOre,
            totalOre: amounts.totalOre,
            lines: lines
              .map((line) => ({
                articleId: line.articleId,
                articleNumber: line.number,
                name: line.name,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
                vatCode: line.vatCode,
                accountNumber: line.accountNumber,
                sumOre: lineOre(line.unitPrice, line.quantity),
              }))
              .filter((line) => line.sumOre !== null),
          })
        : createInvoice(companyId, {
        invoiceType: type,
        customerId,
        customerNumber,
        customerName: name,
        reference,
        invoiceDate,
        paymentDays,
        dueDate,
        purchaseDate,
        ownComment,
        invoiceComment,
        pricesIncludeVat: part.includingVat,
        freight: part.freight,
        invoiceFee: part.invoiceFee,
        currency: part.currency,
        netOre: amounts.netOre,
        vatOre: amounts.vatOre,
        grossOre: amounts.grossOre,
        roundingOre: amounts.roundingOre,
        totalOre: amounts.totalOre,
        lines: lines
          .map((line) => ({
            articleId: line.articleId,
            articleNumber: line.number,
            name: line.name,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            vatCode: line.vatCode,
            accountNumber: line.accountNumber,
            sumOre: lineOre(line.unitPrice, line.quantity),
          }))
          .filter((line) => line.sumOre !== null),
      }));
      if (!result.ok) {
        setSaveError(result.error);
        setSaving(false);
        return;
      }
      setSaving(false);
      if (initial) router.refresh();
      else router.push(`/foretag/${companyId}/kundfakturor`);
    } catch {
      setSaveError("Fakturan kunde inte sparas.");
      setSaving(false);
    }
  }

  return (
    <div className="border border-neutral-200 bg-white px-4 py-3">
      <fieldset disabled={Boolean(initial)} className="min-w-0 border-0 p-0">
      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-1 lg:grid-cols-3">
        <div className="lg:col-start-1 lg:row-start-1">
          <Field label="Fakturanummer">
            <input
              readOnly
              value={initial ? String(initial.number).padStart(5, "0") : "Automatiskt"}
              aria-label="Fakturanummer"
              className={`${fieldClass} bg-neutral-50 tabular-nums ${initial ? "text-neutral-900" : "text-neutral-500"}`}
            />
          </Field>
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <Field label="Typ">
            <select
              aria-label="Typ"
              value={type}
              onChange={(event) => setType(event.target.value as InvoiceType)}
              className={fieldClass}
            >
              {INVOICE_TYPES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="lg:col-start-1 lg:row-start-3">
          <Field label="Namn">
            <CustomerLookup
              customers={customers}
              label="Namn"
              value={name}
              onChange={(value) => {
                setName(value);
                setCustomerId("");
                setCustomerNumber("");
              }}
              onPick={(customer) => {
                setName(customer.name);
                setCustomerId(customer.id);
                setCustomerNumber(customer.number);
              }}
            />
          </Field>
        </div>
        <div className="lg:col-start-1 lg:row-start-4">
          <Field label="Kundnummer">
            <CustomerLookup
              customers={customers}
              label="Kundnummer"
              digitsOnly
              value={customerNumber}
              onChange={(value) => {
                setCustomerNumber(value);
                setCustomerId("");
                setName("");
              }}
              onPick={(customer) => {
                setName(customer.name);
                setCustomerId(customer.id);
                setCustomerNumber(customer.number);
              }}
            />
          </Field>
        </div>

        <div className="lg:col-start-2 lg:row-start-1">
          <Field label="Referens">
            <input
              aria-label="Referens"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
          {type === "faktura" ? (
            <>
              <div className="lg:col-start-2 lg:row-start-2">
              <Field label="Fakturadatum">
                <DateTextInput
                  aria-label="Fakturadatum"
                  value={invoiceDate}
                  onChange={(event) => changeInvoiceDate(event.target.value)}
                  onBlur={() =>
                    commitTypedDate(invoiceDate, (iso) => {
                      setInvoiceDate(iso);
                      if (iso) setDueDate(addDays(iso, paymentDays));
                    })
                  }
                  className={`${fieldClass} tabular-nums`}
                />
              </Field>
              </div>
              <div className="lg:col-start-2 lg:row-start-3">
              <Field label="Betalningsvillkor">
                <select
                  aria-label="Betalningsvillkor"
                  value={paymentDays}
                  onChange={(event) => changePaymentDays(Number(event.target.value))}
                  className={fieldClass}
                >
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term.days} value={term.days}>
                      {term.label}
                    </option>
                  ))}
                </select>
              </Field>
              </div>
              <div className="lg:col-start-2 lg:row-start-4">
              <Field label="Förfallodatum">
                <DateTextInput
                  aria-label="Förfallodatum"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  onBlur={() => commitTypedDate(dueDate, setDueDate)}
                  className={`${fieldClass} tabular-nums`}
                />
              </Field>
              </div>
            </>
          ) : null}
          {type === "kvitto" ? (
            <div className="lg:col-start-2 lg:row-start-2">
            <Field label="Köpdatum">
              <DateTextInput
                aria-label="Köpdatum"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                onBlur={() => commitTypedDate(purchaseDate, setPurchaseDate)}
                className={`${fieldClass} tabular-nums`}
              />
            </Field>
            </div>
          ) : null}
          {type === "kreditfaktura" ? (
            <div className="lg:col-start-2 lg:row-start-2">
            <Field label="Fakturadatum">
              <DateTextInput
                aria-label="Fakturadatum"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
                onBlur={() => commitTypedDate(invoiceDate, setInvoiceDate)}
                className={`${fieldClass} tabular-nums`}
              />
            </Field>
            </div>
          ) : null}

        <p className="flex h-7 items-center text-sm text-neutral-700 lg:col-start-3 lg:row-start-1">
          Kommentar
        </p>
        <div className="flex gap-2 self-stretch lg:col-start-3 lg:row-span-3 lg:row-start-2">
          <textarea
            aria-label="Egen kommentar"
            placeholder="Egen"
            value={ownComment}
            onChange={(event) => setOwnComment(event.target.value)}
            className="h-full min-h-0 w-full resize-none border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-neutral-400"
          />
          <textarea
            aria-label="Kommentar på faktura"
            placeholder="På faktura"
            value={invoiceComment}
            onChange={(event) => setInvoiceComment(event.target.value)}
            className="h-full min-h-0 w-full resize-none border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-neutral-400"
          />
        </div>
      </div>
      <InvoiceLines
        articles={articles}
        accounts={accounts}
        accountNumbers={accountNumbers}
        companyId={companyId}
        lines={lines}
        onLines={setLines}
      />
      </fieldset>
      <InvoiceTotals
        lines={lines}
        saving={saving}
        saveError={saveError}
        onSave={save}
        initial={initial}
        locked={Boolean(initial)}
        paymentDate={initial ? paymentDate : undefined}
        onPaymentDate={initial ? setPaymentDate : undefined}
      />
    </div>
  );
}
