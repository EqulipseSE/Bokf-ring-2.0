import type { ReactNode } from "react";
import type { MenuIcon } from "./menu";

const PATHS: Record<MenuIcon, ReactNode> = {
  buildings: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01M15 10h.01M12 10h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 6.3l1.4 1.4M17.7 16.3l1.4 1.4M3 12h2M19 12h2M4.9 17.7l1.4-1.4M17.7 7.7l1.4-1.4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M10 12h10" />
    </>
  ),
  transfer: (
    <>
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  percent: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 7h12M8 12h12M8 17h12" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="1.5" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4v16M5 20h14" />
      <path d="M12 8 6 14H4l3-8h2" />
      <path d="M12 8l6 6h2l-3-8h-2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16V10M12 16V7M17 16v-4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2V5Z" />
      <path d="M6 3a2 2 0 0 0-2 2v15" />
      <path d="M9 8h7M9 12h7" />
    </>
  ),
  report: (
    <>
      <path d="M7 3h8l4 4v14H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M15 3v4h4M9 13h2M9 17h6" />
      <path d="M15 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </>
  ),
  card: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 6v12M6 12h12" />
    </>
  ),
};

export function MenuIconSvg({
  name,
  className,
}: {
  name: MenuIcon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
