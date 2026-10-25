"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/logga-in/actions";
import { MenuIconSvg } from "./menu-icon";
import { groupIdForPath, itemHrefIsCurrent, menuGroups, type MenuItem } from "./menu";

export function CompanyMenu({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const groups = menuGroups(companyId);
  const pathGroupId = groupIdForPath(groups, pathname);
  const [picked, setPicked] = useState<{ id: string; path: string } | null>(
    null
  );

  const selectedId =
    picked && picked.path === pathname
      ? picked.id
      : (pathGroupId ?? "bokforing");
  const selectedGroup =
    groups.find((group) => group.id === selectedId) ?? groups[1];

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-6 px-6">
        <nav className="flex items-center gap-0.5" aria-label="Företagsmeny">
          <Link
            href={`/foretag/${companyId}`}
            className="mr-3 py-3 font-semibold tracking-tight text-neutral-900"
          >
            Omnio
          </Link>
          {groups.map((group) => {
            const isSelected = group.id === selectedGroup.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPicked({ id: group.id, path: pathname })}
                className={`relative px-3 py-2.5 text-sm transition hover:text-neutral-900 ${
                  isSelected
                    ? "font-medium text-neutral-900"
                    : "text-neutral-600"
                }`}
              >
                {group.label}
                {isSelected ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-px bg-neutral-900"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>
        <p className="truncate py-3 text-sm font-medium text-neutral-600">
          {companyName}
        </p>
      </div>

      <nav
        aria-label={selectedGroup.label}
        className="flex flex-wrap items-stretch gap-1 border-t border-neutral-100 bg-neutral-50 px-5 py-2.5"
      >
        {selectedGroup.items.map((item) => (
          <ToolbarItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>
    </header>
  );
}

function ToolbarItem({
  item,
  pathname,
}: {
  item: MenuItem;
  pathname: string;
}) {
  const className = toolbarClass(
    "href" in item && itemHrefIsCurrent(item.href, pathname)
  );

  if ("action" in item) {
    return (
      <form action={logout}>
        <button type="submit" className={className}>
          <MenuIconSvg name={item.icon} className="h-6 w-6" />
          <span>{item.label}</span>
        </button>
      </form>
    );
  }

  const current = itemHrefIsCurrent(item.href, pathname);
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={className}
    >
      <MenuIconSvg name={item.icon} className="h-6 w-6" />
      <span>{item.label}</span>
    </Link>
  );
}

function toolbarClass(active: boolean): string {
  return `flex min-w-24 flex-col items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs transition ${
    active
      ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200"
      : "text-neutral-600 hover:bg-white hover:text-neutral-900"
  }`;
}
