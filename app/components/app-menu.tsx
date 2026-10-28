"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { TIDSRAPPORTER_PATH } from "@/lib/time-reports";

export function AppMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const onReports = pathname === TIDSRAPPORTER_PATH;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Meny"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 ${
          open ? "bg-neutral-100 text-neutral-900" : ""
        }`}
      >
        <MenuIconSvg />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Meny"
          className="absolute right-0 z-40 mt-1 min-w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-sm"
        >
          <Link
            role="menuitem"
            href={TIDSRAPPORTER_PATH}
            aria-current={onReports ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`block px-3 py-2 text-sm transition hover:bg-neutral-50 ${
              onReports
                ? "font-medium text-neutral-900"
                : "text-neutral-700"
            }`}
          >
            Tidsrapporter
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function MenuIconSvg() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 4.5h10M3 8h10M3 11.5h10" />
    </svg>
  );
}
