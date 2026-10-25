"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type RefObject } from "react";
import { MenuIconSvg } from "./menu-icon";
import type { MenuItem } from "./menu";

export function ArkivDrawer({
  open,
  onClose,
  items,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const returnNode = returnFocusRef?.current;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnNode?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Stäng Arkiv"
        onClick={onClose}
        className={`absolute inset-0 bg-neutral-900/20 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-labelledby={titleId}
        className={`absolute inset-y-0 left-0 flex w-[min(28rem,92vw)] flex-col bg-white shadow-[8px_0_40px_rgba(15,15,15,0.12)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-6 px-8 pb-4 pt-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
              Meny
            </p>
            <h2
              id={titleId}
              className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900"
            >
              Arkiv
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
          >
            Stäng
          </button>
        </div>

        <nav aria-label="Arkiv" className="flex flex-1 flex-col gap-2 px-6 pb-8 pt-4">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              tabIndex={open ? 0 : -1}
              onClick={onClose}
              className="group flex items-start gap-4 rounded-2xl px-4 py-5 text-left transition hover:bg-neutral-50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition group-hover:bg-white group-hover:shadow-sm group-hover:ring-1 group-hover:ring-neutral-200">
                <MenuIconSvg name={item.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-base font-medium text-neutral-900">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-1 block text-sm leading-relaxed text-neutral-500">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  );
}
