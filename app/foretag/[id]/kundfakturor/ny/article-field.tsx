"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { matchesQuery } from "@/lib/search";
import {
  ArticleDialog,
  emptyArticleDraft,
  type ArticleAccountOption,
  type ArticleDraft,
} from "./article-dialog";

export type ArticleOption = {
  id: string;
  number: string;
  name: string;
  unit?: string;
  unitPrice?: string;
  accountNumber?: string;
  vatCode?: string;
};

export function ArticleField({
  label,
  value,
  articles,
  accounts = [],
  accountNumbers = [],
  companyId,
  showListButton,
  onChange,
  onPick,
  onEnter,
}: {
  label: string;
  value: string;
  articles: ArticleOption[];
  accounts?: ArticleAccountOption[];
  accountNumbers?: string[];
  companyId: string;
  showListButton?: boolean;
  onChange: (value: string) => void;
  onPick: (article: ArticleOption) => void;
  onEnter?: () => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [editor, setEditor] = useState<null | {
    mode: "new" | "edit";
    articleId: string | null;
    draft: ArticleDraft;
  }>(null);

  const matches = useMemo(() => {
    const list = articles ?? [];
    const source =
      browse || !value.trim()
        ? list
        : list.filter((article) =>
            matchesQuery([article.number, article.name], value)
          );
    return source.slice(0, 30);
  }, [articles, browse, value]);

  function choose(article: ArticleOption) {
    onPick(article);
    setOpen(false);
    setBrowse(false);
  }

  useEffect(() => {
    if (!open) return;
    function closeIfOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setBrowse(false);
      }
    }
    document.addEventListener("pointerdown", closeIfOutside);
    return () => document.removeEventListener("pointerdown", closeIfOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={label}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setBrowse(false);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((index) =>
              Math.min(index + 1, Math.max(matches.length - 1, 0))
            );
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const typed = value.trim().length > 0;
            if (open && matches[highlight] && (browse || typed)) {
              choose(matches[highlight]);
            } else {
              setOpen(false);
              onEnter?.();
            }
            return;
          }
          if (event.key === "Escape") setOpen(false);
        }}
        className="h-7 min-w-0 flex-1 bg-transparent px-2 text-sm text-neutral-900 outline-none"
      />
      {showListButton ? (
        <button
          type="button"
          aria-label="Visa inlagda artiklar"
          aria-expanded={open}
          onMouseDown={(event) => {
            event.preventDefault();
            setBrowse(true);
            setHighlight(0);
            setOpen(true);
          }}
          className="flex h-7 w-6 shrink-0 items-center justify-center text-neutral-500 hover:text-neutral-900"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : null}
      {open ? (
        <div className="absolute top-full left-0 z-20 mt-0.5 min-w-[32rem] border border-neutral-200 bg-white shadow-md">
          {showListButton ? (
            <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600">
              <div className="flex w-14 shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Redigera artikel"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const article = matches[highlight];
                    setEditor({
                      mode: "edit",
                      articleId: article?.id ?? null,
                      draft: article
                        ? {
                            number: article.number,
                            name: article.name,
                            unit: article.unit ?? "",
                            unitPrice: article.unitPrice ?? "",
                            accountNumber: article.accountNumber ?? "",
                            vatCode: article.vatCode ?? "",
                          }
                        : emptyArticleDraft(),
                    });
                  }}
                  className="flex h-6 w-6 items-center justify-center text-neutral-700 hover:text-neutral-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Ny artikel"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setEditor({ mode: "new", articleId: null, draft: emptyArticleDraft() });
                  }}
                  className="flex h-6 w-6 items-center justify-center text-neutral-700 hover:text-neutral-900"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
              <span className="w-28 shrink-0 whitespace-nowrap">Artikelnummer</span>
              <span className="min-w-0 flex-1">Benämning</span>
              <span className="w-24 shrink-0 text-right whitespace-nowrap">Lagersaldo</span>
            </div>
          ) : null}
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto py-1">
          {matches.length === 0 ? (
            <li className="px-2.5 py-1.5 text-sm text-neutral-500">
              {(articles ?? []).length === 0
                ? "Inga artiklar är inlagda."
                : "Ingen träff."}
            </li>
          ) : (
            matches.map((article, index) => (
              <li key={article.id} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(article);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`flex w-full items-baseline gap-3 px-2.5 py-1.5 text-left text-sm ${
                    index === highlight ? "bg-neutral-100" : ""
                  }`}
                >
                  {showListButton ? <span className="w-14 shrink-0" /> : null}
                  <span className="w-28 shrink-0 font-mono tabular-nums text-neutral-500">
                    {article.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-900">
                    {article.name}
                  </span>
                  {showListButton ? (
                    <span className="w-24 shrink-0 text-right tabular-nums text-neutral-400">
                      —
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
          </ul>
        </div>
      ) : null}
      {editor ? (
        <ArticleDialog
          mode={editor.mode}
          articleId={editor.articleId}
          draft={editor.draft}
          accounts={accounts}
          accountNumbers={accountNumbers}
          companyId={companyId}
          onChange={(draft) => setEditor({ ...editor, draft })}
          onSaved={(article) => {
            onPick(article);
            setEditor(null);
          }}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}
