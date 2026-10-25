"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  isOnVerifikationer,
  resolveKortHref,
  verifikationerBase,
  voucherSubmenuState,
} from "@/lib/voucher-nav";
import { ArkivDrawer } from "./arkiv-drawer";
import { MenuIconSvg } from "./menu-icon";
import {
  ARKIV_LABEL,
  arkivItems,
  groupIdForPath,
  itemHrefIsCurrent,
  menuGroups,
  type MenuItem,
} from "./menu";
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
  const [arkivOpen, setArkivOpen] = useState(false);
  const arkivButtonRef = useRef<HTMLButtonElement>(null);
  const closeArkiv = useCallback(() => setArkivOpen(false), []);
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
    groups.find((group) => group.id === selectedId) ?? groups[0];
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
          <button
            ref={arkivButtonRef}
            type="button"
            aria-expanded={arkivOpen}
            aria-haspopup="dialog"
            aria-pressed={arkivOpen}
            onClick={() => setArkivOpen((open) => !open)}
            className={`relative px-3 py-2.5 text-sm transition hover:text-neutral-900 ${
              arkivOpen
                ? "font-medium text-neutral-900"
                : "text-neutral-600"
            }`}
          >
            {ARKIV_LABEL}
            {arkivOpen ? (
              <span
                aria-hidden
                className="absolute inset-x-3 bottom-0 h-px bg-neutral-900"
              />
            ) : null}
          </button>
          {groups.map((group) => {
            const isSelected = group.id === selectedGroup.id && !arkivOpen;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setArkivOpen(false);
                  setPicked({ id: group.id, path: pathname });
                }}
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
          className="flex flex-wrap items-stretch gap-0.5 border-t border-[#c9c8c6] px-5 py-[7px]"
          style={{ backgroundColor: "#dfdedc" }}
        >
          <SubmenuLink
            href={voucherBase}
            icon="list"
            label="Lista"
            active={submenu.lista}
          />
          <SubmenuLink
            href={kortHref}
            icon="card"
            label="Kort"
            active={submenu.kort}
          />
          <span
            aria-hidden
            className="mx-1.5 my-1 w-px self-stretch bg-[#c9c8c6]"
          />
          <SubmenuLink
            href={`${voucherBase}/ny`}
            icon="plus"
            label="Ny verifikation"
            active={submenu.ny}
            onNavigate={() => setCardTarget(companyId, { kind: "draft" })}
          />
        </nav>
      ) : null}

      <ArkivDrawer
        open={arkivOpen}
        onClose={closeArkiv}
        items={arkivItems(companyId)}
        returnFocusRef={arkivButtonRef}
      />
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
  const current = itemHrefIsCurrent(item.href, pathname);
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={toolbarClass(current)}
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

function SubmenuLink({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: MenuItem["icon"];
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`flex min-w-[4.5rem] flex-col items-center gap-[3px] rounded-lg px-2.5 py-[7px] text-[10px] leading-tight transition ${
        active
          ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-300"
          : "text-neutral-600 hover:bg-white hover:text-neutral-900"
      }`}
    >
      <MenuIconSvg name={icon} className="h-[18px] w-[18px]" />
      <span>{label}</span>
    </Link>
  );
}
