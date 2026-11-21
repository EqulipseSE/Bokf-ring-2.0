"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AccountSearch } from "@/app/foretag/[id]/verifikationer/account-search";
import type { Account } from "@/lib/db/schema";
import { DateTextInput } from "@/app/components/date-text-input";
import { completeAmountDecimals, formatOre, formatOreInput, parseAmountToOre, parseSignedAmountToOre } from "@/lib/money";
import { parseVoucherDate } from "@/lib/voucher-date";
import { matchesQuery } from "@/lib/search";
import { createSupplierInvoice, updateSupplierInvoice } from "./actions";

type SupplierOption = {
  id: string;
  number: string;
  name: string;
  paymentDays: number;
  costAccount: string;
};

type Line = {
  key: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: string;
  credit: string;
};

const fieldClass =
  "h-8 w-full border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400";
const cellInputClass =
  "h-8 w-full bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none focus:bg-white focus:ring-1 focus:ring-neutral-400";

function emptyLine(): Line {
  return {
    key: crypto.randomUUID(),
    accountId: "",
    accountNumber: "",
    accountName: "",
    debit: "",
    credit: "",
  };
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type SupplierInvoiceInitial = {
  invoiceId: string;
  levfakturaNumber: number;
  supplierId: string;
  supplierNumber: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentDate: string;
  total: string;
  vat: string;
  freight: string;
  lines: Line[];
  status?: string;
  bookedInK?: boolean;
  bookedInA?: boolean;
};

export function SupplierInvoiceForm({
  companyId,
  suppliers,
  accounts,
  initial,
}: {
  companyId: string;
  suppliers: SupplierOption[];
  accounts: Account[];
  initial?: SupplierInvoiceInitial;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [supplierNumber, setSupplierNumber] = useState(initial?.supplierNumber ?? "");
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? "");
  const [paymentDays, setPaymentDays] = useState(30);
  const [costAccount, setCostAccount] = useState(
    () => initial?.lines.find((line) => /^[456]/.test(line.accountNumber))?.accountNumber ?? "0"
  );
  const [costQuery, setCostQuery] = useState(
    () => initial?.lines.find((line) => /^[456]/.test(line.accountNumber))?.accountNumber ?? ""
  );
  const [costAccountId, setCostAccountId] = useState(
    () => initial?.lines.find((line) => /^[456]/.test(line.accountNumber))?.accountId ?? ""
  );
  const [rounding, setRounding] = useState(() => {
    const line = initial?.lines.find((item) => item.accountNumber === "3740");
    if (!line) return "0,00";
    const ore = (parseAmountToOre(line.debit) ?? 0) - (parseAmountToOre(line.credit) ?? 0);
    return ore === 0 ? "0,00" : formatOreInput(ore);
  });
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? "");
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [paymentDate, setPaymentDate] = useState(initial?.paymentDate ?? "");
  const [total, setTotal] = useState(initial?.total ?? "");
  const [vat, setVat] = useState(initial?.vat ?? "");
  const [freight, setFreight] = useState(initial?.freight ?? "0");
  const [lines, setLines] = useState<Line[]>(() => initial?.lines ?? Array.from({ length: 8 }, emptyLine));
  const [activeLine, setActiveLine] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonBand, setButtonBand] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const invoiceNumberRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLInputElement>(null);
  const vatRef = useRef<HTMLInputElement>(null);
  const freightRef = useRef<HTMLInputElement>(null);
  const quickAccountRef = useRef<HTMLInputElement>(null);
  const accountRefs = useRef<Array<HTMLInputElement | null>>([]);
  const debitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const creditRefs = useRef<Array<HTMLInputElement | null>>([]);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const filled = table.querySelectorAll<HTMLElement>("tbody tr[data-filled='true']");
    const last = filled[filled.length - 1];
    if (!last) {
      setButtonBand(null);
      return;
    }
    const top = table.getBoundingClientRect().top;
    const bottom = last.getBoundingClientRect().bottom;
    setButtonBand(bottom - top);
  }, [lines]);

  useEffect(() => {
    if (initial) return;
    const today = todayIso();
    setInvoiceDate(today);
    setDueDate(addDays(today, 30));
  }, [initial]);

  const costAccounts = useMemo(
    () => accounts.filter((account) => /^[456]/.test(account.number)),
    [accounts]
  );

  const costOre = useMemo(() => {
    const totalOre = parseAmountToOre(total);
    const vatOre = parseAmountToOre(vat);
    const freightOre = parseAmountToOre(freight);
    const roundingOre = parseSignedAmountToOre(rounding);
    if (totalOre == null || vatOre == null || freightOre == null || roundingOre == null) return null;
    if (!total.trim() || !vat.trim()) return null;
    return totalOre - vatOre - freightOre - roundingOre;
  }, [total, vat, freight, rounding]);

  function pickSupplier(supplier: SupplierOption) {
    setSupplierId(supplier.id);
    setSupplierNumber(supplier.number);
    setSupplierName(supplier.name);
    setPaymentDays(supplier.paymentDays);
    setCostAccount(supplier.costAccount || "0");
    setCostQuery(supplier.costAccount && supplier.costAccount !== "0" ? supplier.costAccount : "");
    setCostAccountId(accounts.find((account) => account.number === supplier.costAccount)?.id ?? "");
    if (invoiceDate) setDueDate(addDays(invoiceDate, supplier.paymentDays));
  }

  function clearSupplierLink() {
    setSupplierId("");
    setCostAccount("0");
    setPaymentDays(30);
  }

  function commitDate(raw: string, apply: (iso: string) => void) {
    const trimmed = raw.trim();
    if (!trimmed) {
      apply("");
      return;
    }
    const parsed = parseVoucherDate(trimmed, invoiceDate || todayIso());
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    apply(parsed.iso);
  }

  function changeDate(value: string) {
    setInvoiceDate(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) setDueDate(addDays(value, paymentDays));
  }

  function focusGrid(index: number) {
    window.requestAnimationFrame(() => {
      accountRefs.current[index]?.focus();
    });
  }

  function fillCostLine() {
    const accountNumber = costQuery.trim() || (costAccount !== "0" ? costAccount : "");
    if (!accountNumber || accountNumber === "0" || costOre == null || costOre === 0) {
      focusGrid(0);
      return;
    }
    const account = costAccounts.find((item) => item.number === accountNumber) ?? null;
    const roundingOre = parseSignedAmountToOre(rounding) ?? 0;
    const roundingAccount = accounts.find((item) => item.number === "3740") ?? null;
    setLines((prev) => {
      const next = [...prev];
      const place = (accountId: string, number: string, name: string, ore: number) => {
        const index = next.findIndex((line) => line.accountNumber === number);
        const empty = next.findIndex((line) => !line.accountNumber.trim() && !line.debit && !line.credit);
        const target = index !== -1 ? index : empty === -1 ? next.length : empty;
        if (target === next.length) next.push(emptyLine());
        next[target] = {
          ...next[target],
          accountId,
          accountNumber: number,
          accountName: name,
          debit: ore > 0 ? formatOreInput(ore) : "",
          credit: ore < 0 ? formatOreInput(-ore) : "",
        };
      };
      place(account?.id ?? "", account?.number ?? accountNumber, account?.name ?? "", costOre);
      if (roundingOre !== 0) {
        place(roundingAccount?.id ?? "", "3740", roundingAccount?.name ?? "Öres- och kronutjämning", roundingOre);
      }
      window.requestAnimationFrame(() => accountRefs.current[0]?.focus());
      return next;
    });
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function save(approve = false) {
    setSaving(true);
    setError(null);
    const payload = {
      supplierId,
      supplierNumber,
      supplierName,
      invoiceNumber,
      invoiceDate,
      dueDate,
      paymentDate,
      totalOre: parseAmountToOre(total) ?? 0,
      vatOre: parseAmountToOre(vat) ?? 0,
      freightOre: parseAmountToOre(freight) ?? 0,
      lines: lines
        .filter((line) => line.accountNumber.trim())
        .map((line) => ({
          accountId: line.accountId,
          accountNumber: line.accountNumber,
          debitOre: parseAmountToOre(line.debit) ?? 0,
          creditOre: parseAmountToOre(line.credit) ?? 0,
        })),
      approve,
    };
    const result = await (initial
      ? updateSupplierInvoice(companyId, initial.invoiceId, payload)
      : createSupplierInvoice(companyId, payload));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (initial) router.refresh();
    else router.push(`/foretag/${companyId}/leverantorsfakturor`);
  }

  return (
    <div
      className="space-y-6 pt-6"
      onMouseDownCapture={(event) => {
        if (event.target instanceof HTMLInputElement) event.target.dataset.selectAll = "1";
      }}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLInputElement) event.target.select();
      }}
      onMouseUpCapture={(event) => {
        const field = event.target;
        if (field instanceof HTMLInputElement && field.dataset.selectAll === "1") {
          event.preventDefault();
          delete field.dataset.selectAll;
        }
      }}
    >
      <div className="grid items-start gap-x-16 gap-y-2 lg:grid-cols-2">
      <div className="grid gap-2">
        {initial ? (
          <Field label="Levfaktnr">
            <p className="px-2 text-sm tabular-nums">{String(initial.levfakturaNumber).padStart(5, "0")}</p>
          </Field>
        ) : null}
        <SupplierLookup
          suppliers={suppliers}
          label="Leverantörsnummer"
          digitsOnly
          value={supplierNumber}
          onChange={(value) => {
            setSupplierNumber(value);
            setSupplierName("");
            clearSupplierLink();
          }}
          onPick={(supplier) => {
            pickSupplier(supplier);
            invoiceNumberRef.current?.focus();
          }}
          onEnter={() => invoiceNumberRef.current?.focus()}
        />
        <SupplierLookup
          suppliers={suppliers}
          label="Namn"
          value={supplierName}
          onChange={(value) => {
            setSupplierName(value);
            setSupplierNumber("");
            clearSupplierLink();
          }}
          onPick={(supplier) => {
            pickSupplier(supplier);
            invoiceNumberRef.current?.focus();
          }}
          onEnter={() => invoiceNumberRef.current?.focus()}
        />
        <Field label="Fakturanummer">
          <input
            ref={invoiceNumberRef}
            aria-label="Fakturanummer"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                dateRef.current?.focus();
              }
            }}
            className={fieldClass}
          />
        </Field>
        <Field label="Fakturadatum">
          <DateTextInput
            ref={dateRef}
            aria-label="Fakturadatum"
            value={invoiceDate}
            onChange={(event) => changeDate(event.target.value)}
            onBlur={() =>
              commitDate(invoiceDate, (iso) => {
                setInvoiceDate(iso);
                if (iso) setDueDate(addDays(iso, paymentDays));
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                totalRef.current?.focus();
              }
            }}
            className={`${fieldClass} tabular-nums`}
          />
        </Field>
        <Field label="Förfallodatum">
          <DateTextInput
            aria-label="Förfallodatum"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            onBlur={() => commitDate(dueDate, setDueDate)}
            className={`${fieldClass} tabular-nums`}
          />
        </Field>
        {initial ? (
          <Field label="Betaldatum">
            <DateTextInput
              aria-label="Betaldatum"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              onBlur={() => commitDate(paymentDate, setPaymentDate)}
              className={`${fieldClass} tabular-nums`}
            />
          </Field>
        ) : null}
      </div>
      <div className="w-fit">
      <div className="grid w-fit grid-cols-[auto_7.25rem] items-center gap-x-1.5 gap-y-2 text-sm text-neutral-700">
        <span>Totalt</span>
        <input
            ref={totalRef}
            inputMode="decimal"
            aria-label="Totalt"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            onBlur={(event) => setTotal(completeAmountDecimals(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                vatRef.current?.focus();
              }
            }}
            className={`${fieldClass} text-right tabular-nums`}
          />
        <span>Moms</span>
        <input
            ref={vatRef}
            inputMode="decimal"
            aria-label="Moms"
            value={vat}
            onChange={(event) => setVat(event.target.value)}
            onBlur={(event) => setVat(completeAmountDecimals(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                freightRef.current?.focus();
              }
            }}
            className={`${fieldClass} text-right tabular-nums`}
          />
        <span>Frakt</span>
        <input
            ref={freightRef}
            inputMode="decimal"
            aria-label="Frakt"
            value={freight}
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
              if (event.key === "Enter") {
                event.preventDefault();
                quickAccountRef.current?.focus();
              }
            }}
            className={`${fieldClass} text-right tabular-nums`}
          />
        <span className="flex items-center gap-1.5">
          Kostnad
          <span className="w-[4.5rem]">
            <AccountSearch
              boxed
              arrow
              companyId={companyId}
              accounts={costAccounts}
              query={costQuery}
              selectedId={costAccountId}
              inputRef={(el) => {
                quickAccountRef.current = el;
              }}
              onQueryChange={(value) => {
                setCostQuery(value);
                setCostAccountId("");
              }}
onSelect={(account) => {
                  if (!account) {
                    setCostAccountId("");
                    return;
                  }
                  setCostQuery(account.number);
                  setCostAccountId(account.id);
                  setCostAccount(account.number);
                }}
              onCommit={() => fillCostLine()}
            />
          </span>
        </span>
        <input
          aria-label="Kostnadssumma"
          readOnly
          tabIndex={-1}
          value={costOre == null ? "" : formatOre(costOre)}
          className={`${fieldClass} text-right tabular-nums`}
        />
        <span>Öresutjämning</span>
        <input
          inputMode="decimal"
          aria-label="Öresutjämning"
          value={rounding}
          onChange={(event) => setRounding(event.target.value)}
          onBlur={(event) => setRounding(completeAmountDecimals(event.target.value))}
          className={`${fieldClass} text-right tabular-nums`}
        />
      </div>
      {initial?.status ? (
        <p className="mt-3 text-sm text-neutral-900">
          <span className="text-neutral-700">Status </span>
          {statusLabel(initial.status, initial.bookedInK, initial.bookedInA)}
        </p>
      ) : null}
      </div>
      </div>

      <div className="flex items-start">
      <table ref={tableRef} className="w-full max-w-2xl shrink-0 border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
            <th className="w-28 px-2 py-2">Konto</th>
            <th className="px-2 py-2">Benämning</th>
            <th className="w-36 px-2 py-2 text-right">Debet</th>
            <th className="w-36 px-2 py-2 text-right">Kredit</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr
              key={line.key}
              data-filled={line.accountNumber.trim() ? "true" : undefined}
              onClick={() => setActiveLine(index)}
              onFocusCapture={() => setActiveLine(index)}
              className={`border-b border-neutral-200 ${
                activeLine === index
                  ? "bg-neutral-100 shadow-[inset_3px_0_0_#171717]"
                  : "hover:bg-neutral-50"
              }`}
            >
              <td className="p-0">
                <AccountSearch
                  companyId={companyId}
                  accounts={accounts}
                  query={line.accountNumber}
                  selectedId={line.accountId}
                  inputRef={(el) => {
                    accountRefs.current[index] = el;
                  }}
                  onQueryChange={(accountNumber) =>
                    updateLine(index, { accountNumber, accountId: "", accountName: "" })
                  }
                  onSelect={(account) => {
                    if (!account) {
                      updateLine(index, { accountId: "", accountName: "" });
                      return;
                    }
                    updateLine(index, {
                      accountId: account.id,
                      accountNumber: account.number,
                      accountName: account.name,
                    });
                  }}
                  onCommit={() => debitRefs.current[index]?.focus()}
                />
              </td>
              <td className="px-2 text-neutral-600">{line.accountName}</td>
              <td className="p-0">
                <input
                  ref={(el) => {
                    debitRefs.current[index] = el;
                  }}
                  aria-label={`Debet rad ${index + 1}`}
                  inputMode="decimal"
                  value={line.debit}
                  onChange={(event) => updateLine(index, { debit: event.target.value, credit: "" })}
                  onBlur={(event) =>
                    updateLine(index, { debit: completeAmountDecimals(event.target.value) })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (line.debit.trim()) accountRefs.current[index + 1]?.focus();
                      else creditRefs.current[index]?.focus();
                    }
                  }}
                  className={`${cellInputClass} text-right tabular-nums`}
                />
              </td>
              <td className="p-0">
                <input
                  ref={(el) => {
                    creditRefs.current[index] = el;
                  }}
                  aria-label={`Kredit rad ${index + 1}`}
                  inputMode="decimal"
                  value={line.credit}
                  onChange={(event) => updateLine(index, { credit: event.target.value, debit: "" })}
                  onBlur={(event) =>
                    updateLine(index, { credit: completeAmountDecimals(event.target.value) })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      accountRefs.current[index + 1]?.focus();
                    }
                  }}
                  className={`${cellInputClass} text-right tabular-nums`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className="flex flex-1 flex-col items-center justify-end gap-2"
        style={buttonBand == null ? undefined : { height: buttonBand }}
      >
        <button
          type="button"
          disabled={saving}
          onClick={() => save(false)}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Sparar…" : "Spara"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => save(true)}
          className="rounded-md border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
        >
          Godkänn
        </button>
        {error ? <p className="max-w-40 text-sm text-red-700">{error}</p> : null}
      </div>
      </div>
    </div>
  );
}

function statusLabel(status: string, bookedInK = false, bookedInA = false): string {
  if (bookedInK && bookedInA) return "Bokförd i L-serien och bokförd betalning";
  if (bookedInK) return "Bokförd i L-serien";
  if (bookedInA) return "Bokförd betalning";
  if (status === "preliminar") return "Preliminär";
  if (status === "godkand") return "Godkänd";
  if (status === "betald") return "Betald";
  if (status === "obetald") return "Obetald";
  return status;
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-neutral-700">
      <span className="w-40 shrink-0">{label}</span>
      <span className={wide ? "w-72 shrink-0" : "w-44 shrink-0"}>{children}</span>
    </label>
  );
}

function SupplierLookup({
  suppliers,
  label,
  value,
  digitsOnly = false,
  onChange,
  onPick,
  onEnter,
}: {
  suppliers: SupplierOption[];
  label: string;
  value: string;
  digitsOnly?: boolean;
  onChange: (value: string) => void;
  onPick: (supplier: SupplierOption) => void;
  onEnter: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const matches = suppliers.filter((supplier) =>
    matchesQuery(digitsOnly ? [supplier.number] : [supplier.number, supplier.name], value)
  );

  function choose(supplier: SupplierOption) {
    onPick(supplier);
    setOpen(false);
  }

  return (
    <Field label={label}>
      <div className="relative">
        <input
          role="combobox"
          aria-label={label}
          aria-expanded={open}
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
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
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
            if (event.key === "Enter") {
              event.preventDefault();
              const typed = event.currentTarget.value.trim();
              const live = suppliers.filter((supplier) =>
                matchesQuery(
                  digitsOnly ? [supplier.number] : [supplier.number, supplier.name],
                  typed
                )
              );
              if (typed && live[highlight]) choose(live[highlight]);
              else onEnter();
            }
          }}
          className={fieldClass}
        />
        {open && value.trim() ? (
          <ul className="absolute z-20 mt-0.5 max-h-48 w-full overflow-auto border border-neutral-200 bg-white py-1 shadow-md">
            {matches.length === 0 ? (
              <li className="px-2.5 py-1.5 text-sm text-neutral-500">Ingen träff.</li>
            ) : (
              matches.map((supplier, index) => (
                <li key={supplier.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(supplier);
                    }}
                    className={`flex w-full gap-3 px-2.5 py-1.5 text-left text-sm ${
                      index === highlight ? "bg-neutral-100" : ""
                    }`}
                  >
                    <span className="w-12 tabular-nums text-neutral-500">{supplier.number}</span>
                    <span className="truncate">{supplier.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
