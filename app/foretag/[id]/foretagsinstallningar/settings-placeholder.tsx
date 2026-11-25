export function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
        {title}
      </h2>
      <p className="mt-2 text-sm text-neutral-500">Kommer senare.</p>
    </div>
  );
}
