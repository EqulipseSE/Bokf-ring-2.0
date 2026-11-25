export const SETTINGS_TABS = [
  {
    id: "foretag",
    label: "Företag",
    children: [
      { id: "uppgifter", label: "Uppgifter" },
      { id: "mallar", label: "Mallar" },
      { id: "e-posttexter", label: "E-posttexter" },
    ],
  },
  {
    id: "forsaljning",
    label: "Försäljning",
    children: [{ id: "bortskrivningar", label: "Bortskrivningar" }],
  },
  {
    id: "bokforing",
    label: "Bokföring",
    children: [
      { id: "resultatenheter", label: "Resultatenheter" },
      { id: "automatfordelning", label: "Automatfördelning" },
      { id: "snabbtexter", label: "Snabbtexter" },
      { id: "serier", label: "Serier" },
      { id: "sie", label: "SIE" },
    ],
  },
] as const;

export type SettingsFlikId = (typeof SETTINGS_TABS)[number]["id"];
export type SettingsUnderId =
  (typeof SETTINGS_TABS)[number]["children"][number]["id"];

export type SettingsSelection = {
  flik: SettingsFlikId;
  under: SettingsUnderId;
  label: string;
};

const DEFAULT: SettingsSelection = {
  flik: "foretag",
  under: "uppgifter",
  label: "Uppgifter",
};

export function parseSettingsSelection(query: {
  flik?: string | string[];
  under?: string | string[];
}): SettingsSelection {
  const flikRaw = Array.isArray(query.flik) ? query.flik[0] : query.flik;
  const underRaw = Array.isArray(query.under) ? query.under[0] : query.under;

  const group =
    SETTINGS_TABS.find((tab) => tab.id === flikRaw) ?? SETTINGS_TABS[0];
  const child =
    group.children.find((item) => item.id === underRaw) ?? group.children[0];

  return {
    flik: group.id,
    under: child.id,
    label: child.label,
  };
}

export function settingsHref(
  companyId: string,
  flik: SettingsFlikId,
  under: SettingsUnderId
): string {
  return `/foretag/${companyId}/foretagsinstallningar?flik=${flik}&under=${under}`;
}
