"use client";

import { useEffect, useRef, useState } from "react";
import { DateTextInput } from "@/app/components/date-text-input";
import { AccountSearch } from "@/app/foretag/[id]/verifikationer/account-search";
import type { Account } from "@/lib/db/schema";
import { formatOre } from "@/lib/money";
import { parseVoucherDate, todayIsoDate } from "@/lib/voucher-date";
import { loadAccountAnalysis, type AccountAnalysisRow } from "./actions";

const fieldClass =
  "h-10 w-40 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm tabular-nums text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200";

type SeriesOption = { id: string; letter: string; description: string };

type RecentSearch = {
  accountId: string;
  accountNumber: string;
  accountName: string;
  from: string;
  to: string;
  seriesIds: string[];
};

export function AnalysisForm({
  companyId,
  accounts,
  series,
}: {
  companyId: string;
  accounts: Account[];
  series: SeriesOption[];
}) {
  const today = todayIsoDate();
  const severalSeries = series.length > 1;
  const [query, setQuery] = useState("");
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [seriesIds, setSeriesIds] = useState<string[]>(series.map((item) => item.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<AccountAnalysisRow[] | null>(null);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const visaRef = useRef<HTMLButtonElement>(null);

  const storageKey = `omnio-kontoanalys:${companyId}`;

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as RecentSearch[];
      if (Array.isArray(parsed)) setRecent(parsed.slice(0, 5));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function commitDate(raw: string, apply: (iso: string) => void, reference: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      apply("");
      return "";
    }
    const parsed = parseVoucherDate(trimmed, reference);
    if (!parsed.ok) {
      setError(parsed.error);
      return null;
    }
    setError(null);
    apply(parsed.iso);
    return parsed.iso;
  }
  const account = accounts.find((item) => item.id === accountId) ?? null;
  const allSeries = seriesIds.length === series.length;

  function remember(search: RecentSearch) {
    const next = [
      search,
      ...recent.filter(
        (item) =>
          !(
            item.accountId === search.accountId &&
            item.from === search.from &&
            item.to === search.to &&
            item.seriesIds.join() === search.seriesIds.join()
          )
      ),
    ].slice(0, 5);
    setRecent(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  async function show(search: RecentSearch) {
    setPending(true);
    setError(null);
    const loaded = await loadAccountAnalysis(
      companyId,
      search.accountId,
      search.from,
      search.to,
      search.seriesIds
    );
    setPending(false);
    if (!loaded.ok) {
      setError(loaded.error);
      setRows(null);
      return;
    }
    setRows(loaded.rows);
    remember(search);
  }

  function submit() {
    if (!account) {
      setError("Välj ett konto.");
      return;
    }
    const parsedFrom = parseVoucherDate(from, today);
    const parsedTo = parseVoucherDate(to, parsedFrom.ok ? parsedFrom.iso : today);
    if (!parsedFrom.ok) {
      setError(parsedFrom.error);
      return;
    }
    if (!parsedTo.ok) {
      setError(parsedTo.error);
      return;
    }
    if (severalSeries && seriesIds.length === 0) {
      setError("Välj minst en serie.");
      return;
    }
    setFrom(parsedFrom.iso);
    setTo(parsedTo.iso);
    void show({
      accountId: account.id,
      accountNumber: account.number,
      accountName: account.name,
      from: parsedFrom.iso,
      to: parsedTo.iso,
      seriesIds: severalSeries ? seriesIds : series.map((item) => item.id),
    });
  }

  function applyRecent(search: RecentSearch) {
    setQuery(search.accountNumber);
    setAccountId(search.accountId);
    setFrom(search.from);
    setTo(search.to);
    setSeriesIds(search.seriesIds);
    void show(search);
  }

  function seriesLabel(ids: string[]) {
    if (!severalSeries || ids.length === series.length) return "";
    const letters = series.filter((item) => ids.includes(item.id)).map((item) => item.letter);
    return letters.join(", ");
  }

  return (
    <div className="w-full max-w-3xl">
      <form
        className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-3">
          <label className="grid w-[4.75rem] shrink-0 gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Konto
            <AccountSearch
              companyId={companyId}
              accounts={accounts}
              query={query}
              selectedId={accountId}
              digitsOnly
              boxed
              onQueryChange={setQuery}
              onSelect={(next) => {
                setAccountId(next?.id ?? "");
                if (next) setQuery(next.number);
              }}
              onCommit={() => fromRef.current?.focus()}
            />
          </label>
          {account ? <p className="pb-1.5 text-sm text-neutral-700">{account.name}</p> : null}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Från
            <DateTextInput
              ref={fromRef}
              aria-label="Från"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              onBlur={() => commitDate(from, setFrom, today)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (commitDate(from, setFrom, today) !== null) toRef.current?.focus();
              }}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Till
            <DateTextInput
              ref={toRef}
              aria-label="Till"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              onBlur={() => commitDate(to, setTo, from || today)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (commitDate(to, setTo, from || today) !== null) visaRef.current?.focus();
              }}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          {severalSeries ? (
            <fieldset>
              <legend className="text-xs font-medium uppercase tracking-wide text-neutral-500">Serier</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={allSeries}
                  onClick={() => setSeriesIds(series.map((item) => item.id))}
                  className={`h-8 rounded-full px-3 text-sm ${allSeries ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"}`}
                >
                  Alla
                </button>
                {series.map((item) => {
                  const selected = seriesIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSeriesIds((current) => {
                          const base = current.length === series.length ? [] : current;
                          return base.includes(item.id)
                            ? base.filter((id) => id !== item.id)
                            : [...base, item.id];
                        });
                      }}
                      className={`h-8 rounded-full px-3 text-sm ${selected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"}`}
                    >
                      {item.letter}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <span />
          )}
          <button
            ref={visaRef}
            type="submit"
            disabled={pending}
            className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {pending ? "Hämtar…" : "Visa"}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </form>

      {recent.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-800">Senaste sökningar</h2>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {recent.map((search) => (
              <li key={`${search.accountId}-${search.from}-${search.to}-${search.seriesIds.join()}`} className="border-b border-neutral-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => applyRecent(search)}
                  className="flex w-full items-baseline gap-3 px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
                >
                  <span className="font-mono tabular-nums text-neutral-900">{search.accountNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-700">{search.accountName}</span>
                  <span className="tabular-nums text-neutral-500">
                    {search.from} – {search.to}
                    {seriesLabel(search.seriesIds) ? ` · ${seriesLabel(search.seriesIds)}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rows ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <p className="px-4 py-4 text-sm text-neutral-500">Inga verifikationer på kontot i perioden.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-2">Datum</th>
                  <th className="px-4 py-2">Verifikation</th>
                  <th className="px-4 py-2">Text</th>
                  <th className="px-4 py-2 text-right">Debet</th>
                  <th className="px-4 py-2 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-4 py-2 tabular-nums text-neutral-700">{row.date}</td>
                    <td className="px-4 py-2 tabular-nums text-neutral-900">{row.label}</td>
                    <td className="px-4 py-2 text-neutral-800">{row.text}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.debitOre ? formatOre(row.debitOre) : ""}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.creditOre ? formatOre(row.creditOre) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </div>
  );
}
