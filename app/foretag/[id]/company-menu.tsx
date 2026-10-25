"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { logout } from "@/app/logga-in/actions";
import {
  isOnVerifikationer,
  resolveKortHref,
  verifikationerBase,
  voucherSubmenuState,
} from "@/lib/voucher-nav";
import { MenuIconSvg } from "./menu-icon";
import { groupIdForPath, itemHrefIsCurrent, menuGroups, type MenuItem } from "./menu";
import {
  getWorkspace,
  setCardTarget,
  subscribeVoucherWorkspace,
} from "./verifikationer/voucher-draft";

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
  const workspace = useSyncExternalStore(
    subscribeVoucherWorkspace,
    () => getWorkspace(companyId),
    () => getWorkspace(companyId)
  );

  const selectedId =
    picked && picked.path === pathname
      ? picked.id
      : (pathGroupId ?? "bokforing");
  const selectedGroup =
    groups.find((group) => group.id === selectedId) ?? groups[1];
  const submenu = voucherSubmenuState(pathname, companyId);
  const showVoucherSubmenu =
    selectedGroup.id === "bokforing" && isOnVerifikationer(pathname, companyId);
  const kortHref = resolveKortHref({
    companyId,
    hasDirtyDraft: workspace.draft !== null,
    target: workspace.target,
  });
  const voucherBase = verifikationerBase(companyId);

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

      {showVoucherSubmenu && submenu ? (
        <nav
          aria-label="Verifikationer"
          className="flex flex-wrap items-stretch gap-1 border-t border-neutral-100 bg-neutral-50 px-5 py-2.5"
        >
          <ToolbarItem
            item={{ label: "Lista", href: voucherBase, icon: "list" }}
            pathname={pathname}
            active={submenu.lista}
          />
          <ToolbarItem
            item={{ label: "Kort", href: kortHref, icon: "card" }}
            pathname={pathname}
            active={submenu.kort}
          />
          <span
            aria-hidden
            className="mx-2 my-1 w-px self-stretch bg-neutral-200"
          />
          <ToolbarItem
            item={{
              label: "Ny verifikation",
              href: `${voucherBase}/ny`,
              icon: "plus",
            }}
            pathname={pathname}
            active={submenu.ny}
            onNavigate={() => setCardTarget(companyId, { kind: "draft" })}
          />
        </nav>
      ) : null}
    </header>
  );
}

function ToolbarItem({
  item,
  pathname,
  active,
  onNavigate,
}: {
  item: MenuItem;
  pathname: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const current =
    active ?? ("href" in item && itemHrefIsCurrent(item.href, pathname));
  const className = toolbarClass(Boolean(current));

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

  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
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
