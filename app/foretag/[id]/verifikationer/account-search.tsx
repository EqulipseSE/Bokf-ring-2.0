"use client";

import { useId, useMemo, useState } from "react";
import type { Account } from "@/lib/db/schema";

type AccountSearchProps = {
  accounts: Account[];
  query: string;
  selectedId: string;
  onQueryChange: (query: string) => void;
  onSelect: (account: Account | null) => void;
  onCommit: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
};

export function AccountSearch({
  accounts,
  query,
  selectedId,
  onQueryChange,
  onSelect,
  onCommit,
  inputRef,
}: AccountSearchProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(() => filterAccounts(accounts, query), [accounts, query]);

  function choose(account: Account) {
    onSelect(account);
    setOpen(false);
    onCommit();
  }

  function commitCurrent() {
    const exact = exactAccount(accounts, query);
    if (exact) {
      choose(exact);
      return;
    }
    const highlighted = matches[highlight];
    if (highlighted) {
      choose(highlighted);
      return;
    }
    if (selectedId) {
      setOpen(false);
      onCommit();
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder="Konto"
        onChange={(event) => {
          onQueryChange(event.target.value);
          onSelect(null);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
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
            commitCurrent();
            return;
          }
          if (event.key === "Tab" && !event.shiftKey && (query.trim() || selectedId)) {
            const exact = exactAccount(accounts, query);
            const highlighted = matches[highlight];
            if (exact) {
              onSelect(exact);
              setOpen(false);
            } else if (!selectedId && highlighted) {
              onSelect(highlighted);
              setOpen(false);
            } else {
              setOpen(false);
            }
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
      />
      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {matches.map((account, index) => {
            const active = index === highlight;
            return (
              <li
                key={account.id}
                role="option"
                aria-selected={account.id === selectedId}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(account);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={`flex cursor-pointer items-baseline gap-3 px-3 py-2 text-sm ${
                  active ? "bg-neutral-100" : ""
                }`}
              >
                <span className="w-12 shrink-0 tabular-nums text-neutral-500">
                  {account.number}
                </span>
                <span className="truncate text-neutral-900">{account.name}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function filterAccounts(accounts: Account[], query: string): Account[] {
  const q = query.trim().toLocaleLowerCase("sv");
  if (!q) return accounts.slice(0, 12);
  return accounts
    .filter(
      (account) =>
        account.number.startsWith(q) ||
        account.name.toLocaleLowerCase("sv").includes(q)
    )
    .slice(0, 12);
}

function exactAccount(accounts: Account[], query: string): Account | undefined {
  const q = query.trim().toLocaleLowerCase("sv");
  if (!q) return undefined;
  return accounts.find(
    (account) =>
      account.number === q ||
      `${account.number} ${account.name}`.toLocaleLowerCase("sv") === q
  );
}
