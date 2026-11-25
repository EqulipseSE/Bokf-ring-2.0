import Link from "next/link";
import {
  SETTINGS_TABS,
  settingsHref,
  type SettingsFlikId,
  type SettingsUnderId,
} from "./settings-nav";

export function SettingsTabs({
  companyId,
  flik,
  under,
}: {
  companyId: string;
  flik: SettingsFlikId;
  under: SettingsUnderId;
}) {
  const group = SETTINGS_TABS.find((tab) => tab.id === flik) ?? SETTINGS_TABS[0];

  return (
    <div className="mt-8 space-y-4">
      <nav
        aria-label="Överflikar"
        className="flex flex-wrap gap-1 border-b border-neutral-200"
      >
        {SETTINGS_TABS.map((tab) => {
          const active = tab.id === flik;
          const first = tab.children[0];
          return (
            <Link
              key={tab.id}
              href={settingsHref(companyId, tab.id, first.id)}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <nav aria-label="Underflikar" className="flex flex-wrap gap-2">
        {group.children.map((item) => {
          const active = item.id === under;
          return (
            <Link
              key={item.id}
              href={settingsHref(companyId, group.id, item.id)}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
