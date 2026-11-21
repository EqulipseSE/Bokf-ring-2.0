"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  isOnVerifikationer,
  resolveKortHref,
  verifikationerBase,
  voucherSubmenuState,
} from "@/lib/voucher-nav";
import { ArkivDrawer } from "./arkiv-drawer";
import { MenuIconSvg } from "./menu-icon";
import { SupplierInvoiceMenuActions } from "./leverantorsfakturor/menu-actions";
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
  fiscalYear,
}: {
  companyId: string;
  companyName: string;
  fiscalYear: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groups = menuGroups(companyId);
  const pathGroupId = groupIdForPath(groups, pathname);
  const [picked, setPicked] = useState<{ id: string; path: string } | null>(
    null
  );
  const [override, setOverride] = useState<{ id: string; from: string } | null>(
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
    override && (override.from === pathname || !pathGroupId)
      ? override.id
      : picked && picked.path === pathname
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
  const invoiceBase = `/foretag/${companyId}/kundfakturor`;
  const onInvoices =
    pathname === invoiceBase || pathname.startsWith(`${invoiceBase}/`);
  const invoiceSubmenu = onInvoices
    ? {
        lista: pathname === invoiceBase,
        kort: pathname !== invoiceBase && pathname !== `${invoiceBase}/ny`,
        ny: pathname === `${invoiceBase}/ny`,
      }
    : null;
  const supplierInvoiceBase = `/foretag/${companyId}/leverantorsfakturor`;
  const onSupplierInvoices =
    pathname === supplierInvoiceBase || pathname.startsWith(`${supplierInvoiceBase}/`);
  const supplierInvoiceSubmenu = onSupplierInvoices
    ? {
        lista: pathname === supplierInvoiceBase,
        kort: pathname.startsWith(`${supplierInvoiceBase}/kort`),
        ny: pathname === `${supplierInvoiceBase}/ny`,
      }
    : null;
  const supplierBase = `/foretag/${companyId}/leverantorer`;
  const onSuppliers =
    pathname === supplierBase || pathname.startsWith(`${supplierBase}/`);
  const supplierSubmenu = onSuppliers
    ? {
        lista: pathname === supplierBase,
        kort: pathname !== supplierBase && pathname !== `${supplierBase}/ny`,
        ny: pathname === `${supplierBase}/ny`,
      }
    : null;
  const customerBase = `/foretag/${companyId}/kunder`;
  const onCustomers =
    pathname === customerBase || pathname.startsWith(`${customerBase}/`);
  const customerSubmenu = onCustomers
    ? {
        lista: pathname === customerBase,
        kort: pathname !== customerBase && pathname !== `${customerBase}/ny`,
        ny: pathname === `${customerBase}/ny`,
      }
    : null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-6 px-6">
        <nav className="flex items-center gap-0.5" aria-label="Företagsmeny">
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
            const className = `relative px-3 py-2.5 text-sm transition hover:text-neutral-900 ${
              isSelected ? "font-medium text-neutral-900" : "text-neutral-600"
            }`;
            const mark = isSelected ? (
              <span
                aria-hidden
                className="absolute inset-x-3 bottom-0 h-px bg-neutral-900"
              />
            ) : null;
            const start = group.items[0]?.href;
            if (start) {
              return (
                <Link
                  key={group.id}
                  href={start}
                  aria-current={isSelected ? "page" : undefined}
                  onClick={() => {
                    setArkivOpen(false);
                    setPicked(null);
                    setOverride({ id: group.id, from: pathname });
                  }}
                  className={className}
                >
                  {group.label}
                  {mark}
                </Link>
              );
            }
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setArkivOpen(false);
                  setPicked({ id: group.id, path: pathname });
                }}
                className={className}
              >
                {group.label}
                {mark}
              </button>
            );
          })}
        </nav>
        <Link
          href={`/foretag/${companyId}`}
          className="py-3 font-semibold tracking-tight text-neutral-900"
        >
          Omnio
        </Link>
      </div>

      {selectedGroup.items.length > 0 ? (
        <nav
          aria-label={selectedGroup.label}
          className="flex flex-wrap items-stretch gap-1 border-t border-neutral-100 bg-neutral-50 px-5 py-2.5"
        >
          {selectedGroup.items.map((item) => (
            <ToolbarItem key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>
      ) : null}

      {pathname === `/foretag/${companyId}/underlag` ||
      pathname.startsWith(`/foretag/${companyId}/underlag/`) ? (
        <UnderlagMenu companyId={companyId} pathname={pathname} />
      ) : null}

      {showVoucherSubmenu && submenu ? (
        <ThirdMenu
          label="Verifikationer"
          listaHref={voucherBase}
          kortHref={kortHref}
          nyHref={`${voucherBase}/ny`}
          state={submenu}
          onNy={() => setCardTarget(companyId, { kind: "draft" })}
          nyLabel="Ny verifikation"
        />
      ) : null}

      {invoiceSubmenu ? (
        <ThirdMenu
          label="Kundfakturor"
          listaHref={invoiceBase}
          kortHref={`${invoiceBase}/kort`}
          nyHref={`${invoiceBase}/ny`}
          state={invoiceSubmenu}
          nyLabel="Ny"
          title={
            pathname === `${invoiceBase}/ny` ? "Ny kundfaktura" : undefined
          }
          besideNy={
            /^\/foretag\/[^/]+\/kundfakturor\/kort\/[^/]+$/.test(pathname) ? (
              <SubmenuLink href={pathname} icon="chart" label="Spåra" active={false} />
            ) : null
          }
        />
      ) : null}

      {customerSubmenu ? (
        <ThirdMenu
          label="Kunder"
          listaHref={customerBase}
          kortHref={`${customerBase}/kort`}
          nyHref={`${customerBase}/ny`}
          state={customerSubmenu}
          nyLabel="Ny"
          title={pathname === `${customerBase}/ny` ? "Ny kund" : undefined}
          extraHref={
            searchParams.get("dolda") === "1" ? customerBase : `${customerBase}?dolda=1`
          }
          extraLabel="Visa dolda"
          extraActive={searchParams.get("dolda") === "1"}
        />
      ) : null}

      {supplierInvoiceSubmenu ? (
        <ThirdMenu
          label="Leverantörsfakturor"
          listaHref={supplierInvoiceBase}
          kortHref={`${supplierInvoiceBase}/kort`}
          nyHref={`${supplierInvoiceBase}/ny`}
          state={supplierInvoiceSubmenu}
          nyLabel="Ny"
          title={
            pathname === `${supplierInvoiceBase}/ny` ? "Ny leverantörsfaktura" : undefined
          }
          trailing={<SupplierInvoiceMenuActions companyId={companyId} />}
        />
      ) : null}

      {supplierSubmenu ? (
        <ThirdMenu
          label="Leverantörer"
          listaHref={supplierBase}
          kortHref={`${supplierBase}/kort`}
          nyHref={`${supplierBase}/ny`}
          state={supplierSubmenu}
          nyLabel="Ny"
          title={pathname === `${supplierBase}/ny` ? "Ny leverantör" : undefined}
        />
      ) : null}

      <ArkivDrawer
        open={arkivOpen}
        onClose={closeArkiv}
        items={arkivItems(companyId)}
        returnFocusRef={arkivButtonRef}
      />
      <p className="fixed bottom-4 right-4 z-40 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-right text-sm shadow-sm">
        <span className="block font-medium text-neutral-900">{companyName}</span>
        <span className="text-neutral-500">{fiscalYear}</span>
      </p>
    </header>
  );
}

function UnderlagMenu({
  companyId,
  pathname,
}: {
  companyId: string;
  pathname: string;
}) {
  const base = `/foretag/${companyId}/underlag`;
  const items: { href: string; label: string; icon: MenuItem["icon"] }[] = [
    { href: base, label: "Kontoutdrag", icon: "download" },
    { href: `${base}/kundfakturor`, label: "Kundfakturor", icon: "document" },
    {
      href: `${base}/leverantorsfakturor`,
      label: "Leverantörsfakturor",
      icon: "document",
    },
    { href: `${base}/kvitton`, label: "Kvitton", icon: "card" },
    { href: `${base}/loner`, label: "Löner", icon: "list" },
    { href: `${base}/ovriga`, label: "Övriga", icon: "report" },
  ];
  return (
    <nav
      aria-label="Underlag"
      className="flex flex-wrap items-stretch gap-0.5 border-t border-[#c9c8c6] px-5 py-[7px]"
      style={{ backgroundColor: "#dfdedc" }}
    >
      {items.map((item) => (
        <SubmenuLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={pathname === item.href}
        />
      ))}
      <span aria-hidden className="mx-1.5 my-1 w-px self-stretch bg-[#c9c8c6]" />
      <SubmenuLink
        href={`${base}/nytt`}
        icon="plus"
        label="Nytt underlag"
        active={pathname === `${base}/nytt`}
      />
      <span className="ml-auto">
        <SubmenuLink
          href={`${base}/raderade`}
          icon="trash"
          label="Senast raderade"
          active={pathname === `${base}/raderade`}
        />
      </span>
    </nav>
  );
}

function ThirdMenu({
  label,
  listaHref,
  kortHref,
  nyHref,
  state,
  onNy,
  nyLabel,
  title,
  extraHref,
  extraLabel,
  extraActive,
  trailing,
  besideNy,
}: {
  label: string;
  listaHref: string;
  kortHref: string;
  nyHref: string;
  state: { lista: boolean; kort: boolean; ny: boolean };
  onNy?: () => void;
  nyLabel: string;
  title?: string;
  extraHref?: string;
  extraLabel?: string;
  extraActive?: boolean;
  trailing?: ReactNode;
  besideNy?: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-stretch gap-0.5 border-t border-[#c9c8c6] px-5 py-[7px]"
      style={{ backgroundColor: "#dfdedc" }}
    >
      <SubmenuLink href={listaHref} icon="list" label="Lista" active={state.lista} />
      <SubmenuLink href={kortHref} icon="card" label="Kort" active={state.kort} />
      <span aria-hidden className="mx-1.5 my-1 w-px self-stretch bg-[#c9c8c6]" />
      <SubmenuLink
        href={nyHref}
        icon="plus"
        label={nyLabel}
        active={state.ny}
        onNavigate={onNy}
      />
      {besideNy}
      {trailing}
      {extraHref && extraLabel ? (
        <Link
          href={extraHref}
          aria-pressed={extraActive}
          className={`ml-2 self-center rounded-lg px-3 py-1.5 text-xs ${
            extraActive
              ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-300"
              : "text-neutral-700 hover:bg-white"
          }`}
        >
          {extraLabel}
        </Link>
      ) : null}
      {title ? (
        <span className="ml-auto self-center text-sm font-semibold text-neutral-900">
          {title}
        </span>
      ) : null}
    </nav>
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
