"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/logga-in/actions";
import { menuGroups, type MenuGroup } from "./menu";

export function CompanyMenu({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>(
    {}
  );

  const groups = menuGroups(companyId);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenId((current) => {
          if (current) buttonRefs.current[current]?.focus();
          return null;
        });
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenId(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-6 px-6">
        <nav
          ref={navRef}
          className="flex items-center gap-0.5"
          aria-label="Företagsmeny"
        >
          <Link
            href={`/foretag/${companyId}`}
            className="mr-3 py-3 font-semibold tracking-tight text-neutral-900"
          >
            Omnio
          </Link>
          {groups.map((group) => (
            <MenuButton
              key={group.id}
              group={group}
              pathname={pathname}
              open={openId === group.id}
              buttonRef={(el) => {
                buttonRefs.current[group.id] = el;
              }}
              onToggle={() =>
                setOpenId((current) => (current === group.id ? null : group.id))
              }
              onNavigate={() => setOpenId(null)}
            />
          ))}
        </nav>
        <p className="truncate py-3 text-sm font-medium text-neutral-600">
          {companyName}
        </p>
      </div>
    </header>
  );
}

function MenuButton({
  group,
  pathname,
  open,
  buttonRef,
  onToggle,
  onNavigate,
}: {
  group: MenuGroup;
  pathname: string;
  open: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const isActive = group.items.some(
    (item) => "href" in item && item.href === pathname
  );
  const menuId = `foretagsmeny-${group.id}`;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={onToggle}
        className={`relative rounded-md px-3 py-2 text-sm transition hover:text-neutral-900 ${
          isActive || open
            ? "font-medium text-neutral-900"
            : "text-neutral-600"
        }`}
      >
        {group.label}
        {isActive ? (
          <span
            aria-hidden
            className="absolute inset-x-3 -bottom-0.5 h-px bg-neutral-900"
          />
        ) : null}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-20 mt-1 min-w-52 rounded-xl border border-neutral-200 bg-white py-1 shadow-sm"
        >
          {group.items.map((item) => {
            if ("action" in item) {
              return (
                <form key={item.label} action={logout} role="none">
                  <button
                    type="submit"
                    role="menuitem"
                    className="block w-full px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                  >
                    {item.label}
                  </button>
                </form>
              );
            }

            const current = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={current ? "page" : undefined}
                onClick={onNavigate}
                className={`block px-4 py-2 text-sm transition ${
                  current
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
