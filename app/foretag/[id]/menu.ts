export const PLACEHOLDERS = {
  foretagsinstallningar: "Företagsinställningar",
  momskontroll: "Momskontroll",
  periodlasning: "Periodlåsning",
  arsavslut: "Årsavslut",
  balansrapport: "Balansrapport",
  resultatrapport: "Resultatrapport",
  huvudbok: "Huvudbok",
  momsrapport: "Momsrapport",
} as const;

export type PlaceholderSlug = keyof typeof PLACEHOLDERS;

export function isPlaceholderSlug(value: string): value is PlaceholderSlug {
  return value in PLACEHOLDERS;
}

export function companyHref(
  companyId: string,
  slug: PlaceholderSlug | "verifikationer" | "kontoplan"
): string {
  return `/foretag/${companyId}/${slug}`;
}

export function itemHrefIsCurrent(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type MenuIcon =
  | "buildings"
  | "settings"
  | "logout"
  | "document"
  | "percent"
  | "list"
  | "lock"
  | "calendar"
  | "scale"
  | "chart"
  | "book"
  | "report"
  | "card"
  | "plus";

export type MenuItem =
  | { label: string; href: string; icon: MenuIcon }
  | { label: string; action: "logout"; icon: MenuIcon };

export type MenuGroup = {
  id: string;
  label: string;
  items: MenuItem[];
};

export function menuGroups(companyId: string): MenuGroup[] {
  return [
    {
      id: "arkiv",
      label: "Arkiv",
      items: [
        { label: "Byt företag", href: "/klientforetag", icon: "buildings" },
        {
          label: "Företagsinställningar",
          href: companyHref(companyId, "foretagsinstallningar"),
          icon: "settings",
        },
        { label: "Logga ut", action: "logout", icon: "logout" },
      ],
    },
    {
      id: "bokforing",
      label: "Bokföring",
      items: [
        {
          label: "Verifikationer",
          href: companyHref(companyId, "verifikationer"),
          icon: "document",
        },
        {
          label: "Momskontroll",
          href: companyHref(companyId, "momskontroll"),
          icon: "percent",
        },
        { label: "Kontoplan", href: companyHref(companyId, "kontoplan"), icon: "list" },
        {
          label: "Periodlåsning",
          href: companyHref(companyId, "periodlasning"),
          icon: "lock",
        },
        { label: "Årsavslut", href: companyHref(companyId, "arsavslut"), icon: "calendar" },
      ],
    },
    {
      id: "utskrifter",
      label: "Utskrifter",
      items: [
        {
          label: "Balansrapport",
          href: companyHref(companyId, "balansrapport"),
          icon: "scale",
        },
        {
          label: "Resultatrapport",
          href: companyHref(companyId, "resultatrapport"),
          icon: "chart",
        },
        { label: "Huvudbok", href: companyHref(companyId, "huvudbok"), icon: "book" },
        {
          label: "Momsrapport",
          href: companyHref(companyId, "momsrapport"),
          icon: "report",
        },
      ],
    },
  ];
}

export function groupIdForPath(
  groups: MenuGroup[],
  pathname: string
): string | undefined {
  return groups.find((group) =>
    group.items.some(
      (item) => "href" in item && itemHrefIsCurrent(item.href, pathname)
    )
  )?.id;
}
