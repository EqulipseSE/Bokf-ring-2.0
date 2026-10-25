export const PLACEHOLDERS = {
  foretagsinstallningar: "Företagsinställningar",
  verifikationer: "Verifikationer",
  momskontroll: "Momskontroll",
  kontoplan: "Kontoplan",
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

export function companyHref(companyId: string, slug: PlaceholderSlug): string {
  return `/foretag/${companyId}/${slug}`;
}

export type MenuItem =
  | { label: string; href: string }
  | { label: string; action: "logout" };

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
        { label: "Byt företag", href: "/klientforetag" },
        {
          label: "Företagsinställningar",
          href: companyHref(companyId, "foretagsinstallningar"),
        },
        { label: "Logga ut", action: "logout" },
      ],
    },
    {
      id: "bokforing",
      label: "Bokföring",
      items: [
        {
          label: "Verifikationer",
          href: companyHref(companyId, "verifikationer"),
        },
        {
          label: "Momskontroll",
          href: companyHref(companyId, "momskontroll"),
        },
        { label: "Kontoplan", href: companyHref(companyId, "kontoplan") },
        {
          label: "Periodlåsning",
          href: companyHref(companyId, "periodlasning"),
        },
        { label: "Årsavslut", href: companyHref(companyId, "arsavslut") },
      ],
    },
    {
      id: "utskrifter",
      label: "Utskrifter",
      items: [
        {
          label: "Balansrapport",
          href: companyHref(companyId, "balansrapport"),
        },
        {
          label: "Resultatrapport",
          href: companyHref(companyId, "resultatrapport"),
        },
        { label: "Huvudbok", href: companyHref(companyId, "huvudbok") },
        { label: "Momsrapport", href: companyHref(companyId, "momsrapport") },
      ],
    },
  ];
}
